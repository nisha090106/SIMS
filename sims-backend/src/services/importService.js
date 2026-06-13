import fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { 
  sequelize, 
  Product, 
  ReorderRule, 
  Inventory, 
  Warehouse, 
  User, 
  AuditLog, 
  ImportJob, 
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Normalizes keys of an object to lowercase, trimmed, and underscore-spaced format.
 * Helps handle variations in CSV/Excel headers (e.g. "Unit Price" -> "unit_price").
 */
const normalizeKeys = (row) => {
  const normalized = {};
  for (const key of Object.keys(row)) {
    if (key === undefined || key === null) continue;
    const cleanKey = key.toString().trim().toLowerCase().replace(/\s+/g, '_');
    normalized[cleanKey] = row[key] !== undefined && row[key] !== null ? row[key].toString().trim() : '';
  }
  return normalized;
};

/**
 * Parses import files (CSV or Excel) into an array of objects.
 * @param {string} filePath - Local path to the uploaded file.
 * @param {string} fileType - File extension or format (CSV, XLSX, XLS).
 * @returns {Array<Object>} Array of raw parsed rows.
 */
export const parseFile = (filePath, fileType) => {
  const type = fileType.toLowerCase();
  
  if (type === '.csv') {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } else if (type === '.xlsx' || type === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
};

/**
 * Bulk imports products from rows.
 */
export const importProducts = async (rows, jobId, _triggeredBy) => {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row = normalizeKeys(rawRow);
    const rowNum = i + 1;

    try {
      const nameVal = row.name || row.product_name || '';
      const skuVal = row.sku || '';
      const categoryVal = row.category || 'General';
      const unitVal = row.unit || 'piece';
      const barcodeVal = row.barcode || null;
      const descriptionVal = row.description || null;

      const rawUnitPrice = row.unit_price || row.selling_price || row.sellingprice || row.unitprice || '';
      const rawCostPrice = row.cost_price || row.costprice || '';
      const rawReorderLevel = row.reorder_level || row.reorderlevel || '';
      const rawReorderQty = row.reorder_qty || row.reorderqty || '';

      // Validation
      if (!skuVal) throw new Error('SKU is required.');
      if (!nameVal) throw new Error('Product Name is required.');
      if (!rawUnitPrice) throw new Error('Unit Price is required.');
      const price = parseFloat(rawUnitPrice);
      if (isNaN(price) || price < 0) throw new Error('Unit Price must be a positive number.');
      
      const costPrice = rawCostPrice ? parseFloat(rawCostPrice) : null;
      if (costPrice !== null && (isNaN(costPrice) || costPrice < 0)) {
        throw new Error('Cost Price must be a positive number.');
      }

      if (!rawReorderLevel) throw new Error('Reorder Level is required.');
      const parsedReorderLevel = parseInt(rawReorderLevel, 10);
      if (isNaN(parsedReorderLevel) || parsedReorderLevel < 0) throw new Error('Reorder Level must be a non-negative integer.');
      
      const parsedReorderQty = rawReorderQty ? parseInt(rawReorderQty, 10) : 50;
      if (isNaN(parsedReorderQty) || parsedReorderQty < 0) throw new Error('Reorder Quantity must be a non-negative integer.');

      // Atomic row update / insert
      const t = await sequelize.transaction();
      try {
        let product = await Product.findOne({ where: { sku: skuVal }, transaction: t });
        let isUpdated = false;

        if (product) {
          await product.update({
            name: nameVal,
            category: categoryVal,
            unit: unitVal,
            unit_price: price,
            cost_price: costPrice,
            reorder_level: parsedReorderLevel,
            reorder_qty: parsedReorderQty,
            description: descriptionVal,
            barcode: barcodeVal,
          }, { transaction: t });
          isUpdated = true;
        } else {
          product = await Product.create({
            sku: skuVal,
            name: nameVal,
            category: categoryVal,
            unit: unitVal,
            unit_price: price,
            cost_price: costPrice,
            reorder_level: parsedReorderLevel,
            reorder_qty: parsedReorderQty,
            description: descriptionVal,
            barcode: barcodeVal,
          }, { transaction: t });
        }

        // Upsert Reorder Rule
        const [rule, ruleCreated] = await ReorderRule.findOrCreate({
          where: { product_id: product.product_id },
          defaults: {
            reorder_threshold: parsedReorderLevel,
            reorder_quantity: parsedReorderQty,
            is_active: true,
          },
          transaction: t,
        });

        if (!ruleCreated) {
          await rule.update({
            reorder_threshold: parsedReorderLevel,
            reorder_quantity: parsedReorderQty,
          }, { transaction: t });
        }

        await t.commit();

        if (isUpdated) {
          updated++;
        } else {
          created++;
        }

        // Incrementally update ImportJob progress
        await ImportJob.update({
          processed_rows: created + updated,
        }, {
          where: { id: jobId },
        });

      } catch (dbErr) {
        await t.rollback();
        throw dbErr;
      }

    } catch (err) {
      failed++;
      errors.push({
        row: rowNum,
        error: err.message,
        rawData: rawRow,
      });

      // Incrementally update ImportJob failures
      await ImportJob.update({
        failed_rows: failed,
        error_log: JSON.stringify(errors),
      }, {
        where: { id: jobId },
      });
    }
  }

  return { created, updated, failed, errors };
};

/**
 * Bulk imports stock levels for a specific warehouse.
 */
export const importStock = async (rows, jobId, warehouseId, triggeredBy) => {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  // Verify warehouse exists if default is passed
  if (warehouseId) {
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      throw new Error(`Warehouse with ID ${warehouseId} not found.`);
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row = normalizeKeys(rawRow);
    const rowNum = i + 1;

    try {
      const rawSku = row.sku || '';
      const rawBarcode = row.barcode || '';
      const rawQuantity = row.quantity || '';
      const rawBatchNo = row.batch_no || row.batchnumber || '';
      const rawExpiryDate = row.expiry_date || row.expirydate || '';
      const rawLocation = row.location || row.storagelocation || row.storage_location || '';

      // Validation
      if (!rawSku && !rawBarcode) throw new Error('Either SKU or Barcode is required.');
      if (rawQuantity === undefined || rawQuantity === '') throw new Error('Quantity is required.');
      const qty = parseInt(rawQuantity, 10);
      if (isNaN(qty) || qty < 0) throw new Error('Quantity must be a non-negative integer.');

      let parsedExpiryDate = null;
      if (rawExpiryDate) {
        const d = new Date(rawExpiryDate);
        if (!isNaN(d.getTime())) {
          parsedExpiryDate = d;
        }
      }

      // Resolve warehouse from row.warehouse_code or row.warehousecode if provided
      const rawWarehouseCode = row.warehouse_code || row.warehousecode || row.warehouse || '';
      let targetWarehouseId = warehouseId;
      if (rawWarehouseCode) {
        const wh = await Warehouse.findOne({
          where: { code: rawWarehouseCode.toUpperCase() },
        });
        if (wh) {
          targetWarehouseId = wh.warehouse_id;
        }
      }

      if (!targetWarehouseId) {
        throw new Error('A warehouse must be selected or specified in the import row.');
      }

      // Find Product
      const product = await Product.findOne({
        where: {
          [Op.or]: [
            rawSku ? { sku: rawSku } : null,
            rawBarcode ? { barcode: rawBarcode } : null,
          ].filter(Boolean),
        },
      });

      if (!product) {
        throw new Error(`Product not found for SKU "${rawSku || ''}" or Barcode "${rawBarcode || ''}".`);
      }

      // Upsert Inventory record
      const t = await sequelize.transaction();
      try {
        let inventory = await Inventory.findOne({
          where: { product_id: product.product_id, warehouse_id: targetWarehouseId },
          transaction: t,
        });

        let isUpdated = false;
        let oldQty = 0;

        if (inventory) {
          oldQty = inventory.quantity;
          await inventory.update({
            quantity: qty,
            batch_no: rawBatchNo || inventory.batch_no || null,
            expiry_date: parsedExpiryDate || inventory.expiry_date || null,
            location: rawLocation || inventory.location || null,
          }, { transaction: t });
          isUpdated = true;
        } else {
          inventory = await Inventory.create({
            product_id: product.product_id,
            warehouse_id: targetWarehouseId,
            quantity: qty,
            batch_no: rawBatchNo || null,
            expiry_date: parsedExpiryDate || null,
            location: rawLocation || null,
          }, { transaction: t });
        }

        // Add Audit Log
        await AuditLog.create({
          user_id: triggeredBy,
          action: isUpdated ? 'update' : 'create',
          table_name: 'inventory',
          changes: {
            action: 'STOCK_IMPORT',
            inventory_id: inventory.id,
            product_id: product.product_id,
            warehouse_id: targetWarehouseId,
            old_quantity: oldQty,
            new_quantity: qty,
            location: rawLocation || null,
            batch_no: rawBatchNo || null,
            expiry_date: parsedExpiryDate || null,
          },
          ip_address: '127.0.0.1',
        }, { transaction: t });

        await t.commit();

        if (isUpdated) {
          updated++;
        } else {
          created++;
        }

        // Incrementally update ImportJob progress
        await ImportJob.update({
          processed_rows: created + updated,
        }, {
          where: { id: jobId },
        });

      } catch (dbErr) {
        await t.rollback();
        throw dbErr;
      }

    } catch (err) {
      failed++;
      errors.push({
        row: rowNum,
        error: err.message,
        rawData: rawRow,
      });

      // Incrementally update ImportJob failures
      await ImportJob.update({
        failed_rows: failed,
        error_log: JSON.stringify(errors),
      }, {
        where: { id: jobId },
      });
    }
  }

  return { created, updated, failed, errors };
};

/**
 * Bulk imports warehouses from rows.
 */
export const importWarehouses = async (rows, jobId, triggeredBy) => {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row = normalizeKeys(rawRow);
    const rowNum = i + 1;

    try {
      const nameVal = row.name || '';
      const codeVal = row.code || '';
      const addressVal = row.address || '';
      const cityVal = row.city || '';
      const countryVal = row.country || '';
      const capacityVal = row.capacity || '';
      const managerEmailVal = row.manager_email || row.manageremail || '';
      
      // location might be directly in the row. If not, construct it from city and country.
      const rawLocation = row.location || [cityVal, countryVal].filter(Boolean).join(', ') || codeVal || '';

      // Validation
      if (!nameVal) throw new Error('Warehouse Name is required.');
      if (!rawLocation) throw new Error('Location is required.');
      if (!capacityVal) throw new Error('Capacity is required.');
      const cap = parseFloat(capacityVal);
      if (isNaN(cap) || cap <= 0) throw new Error('Capacity must be a positive number.');

      let warehouse = await Warehouse.findOne({ where: { name: nameVal } });
      let isUpdated = false;

      const t = await sequelize.transaction();
      try {
        if (warehouse) {
          // If updating, find manager or keep existing
          let finalManagerId = warehouse.manager_id;
          if (managerEmailVal) {
            const manager = await User.findOne({ where: { email: managerEmailVal }, transaction: t });
            if (manager) {
              finalManagerId = manager.id;
            }
          }

          await warehouse.update({
            code: codeVal ? codeVal.toUpperCase() : warehouse.code,
            location: rawLocation,
            city: cityVal || warehouse.city || null,
            country: countryVal || warehouse.country || null,
            address: addressVal || warehouse.address || null,
            capacity: cap,
            manager_id: finalManagerId,
          }, { transaction: t });
          isUpdated = true;
        } else {
          // If creating new, find manager or fallback to triggeredBy user
          let finalManagerId = triggeredBy;
          if (managerEmailVal) {
            const manager = await User.findOne({ where: { email: managerEmailVal }, transaction: t });
            if (manager) {
              finalManagerId = manager.id;
            }
          }

          warehouse = await Warehouse.create({
            name: nameVal,
            code: codeVal ? codeVal.toUpperCase() : null,
            location: rawLocation,
            city: cityVal || null,
            country: countryVal || null,
            address: addressVal || null,
            capacity: cap,
            manager_id: finalManagerId,
          }, { transaction: t });
        }

        await t.commit();

        if (isUpdated) {
          updated++;
        } else {
          created++;
        }

        // Incrementally update ImportJob progress
        await ImportJob.update({
          processed_rows: created + updated,
        }, {
          where: { id: jobId },
        });

      } catch (dbErr) {
        await t.rollback();
        throw dbErr;
      }

    } catch (err) {
      failed++;
      errors.push({
        row: rowNum,
        error: err.message,
        rawData: rawRow,
      });

      // Incrementally update ImportJob failures
      await ImportJob.update({
        failed_rows: failed,
        error_log: JSON.stringify(errors),
      }, {
        where: { id: jobId },
      });
    }
  }

  return { created, updated, failed, errors };
};
