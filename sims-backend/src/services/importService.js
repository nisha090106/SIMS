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
      const { 
        name, 
        sku, 
        category, 
        unit, 
        unit_price, 
        reorder_level, 
        reorder_qty, 
        description, 
        barcode, 
      } = row;

      // Validation
      if (!sku) throw new Error('SKU is required.');
      if (!name) throw new Error('Product Name is required.');
      if (!unit_price) throw new Error('Unit Price is required.');
      const price = parseFloat(unit_price);
      if (isNaN(price) || price < 0) throw new Error('Unit Price must be a positive number.');
      if (!reorder_level) throw new Error('Reorder Level is required.');
      const reorderLevelVal = parseInt(reorder_level, 10);
      if (isNaN(reorderLevelVal) || reorderLevelVal < 0) throw new Error('Reorder Level must be a non-negative integer.');
      
      const reorderQtyVal = reorder_qty ? parseInt(reorder_qty, 10) : 50;
      if (isNaN(reorderQtyVal) || reorderQtyVal < 0) throw new Error('Reorder Quantity must be a non-negative integer.');

      // Atomic row update / insert
      const t = await sequelize.transaction();
      try {
        let product = await Product.findOne({ where: { sku }, transaction: t });
        let isUpdated = false;

        if (product) {
          await product.update({
            name,
            category: category || 'General',
            unit: unit || 'piece',
            unit_price: price,
            reorder_level: reorderLevelVal,
            reorder_qty: reorderQtyVal,
            description: description || null,
            barcode: barcode || null,
          }, { transaction: t });
          isUpdated = true;
        } else {
          product = await Product.create({
            sku,
            name,
            category: category || 'General',
            unit: unit || 'piece',
            unit_price: price,
            reorder_level: reorderLevelVal,
            reorder_qty: reorderQtyVal,
            description: description || null,
            barcode: barcode || null,
          }, { transaction: t });
        }

        // Upsert Reorder Rule
        const [rule, ruleCreated] = await ReorderRule.findOrCreate({
          where: { product_id: product.product_id },
          defaults: {
            reorder_threshold: reorderLevelVal,
            reorder_quantity: reorderQtyVal,
            is_active: true,
          },
          transaction: t,
        });

        if (!ruleCreated) {
          await rule.update({
            reorder_threshold: reorderLevelVal,
            reorder_quantity: reorderQtyVal,
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

  // Verify warehouse exists
  const warehouse = await Warehouse.findByPk(warehouseId);
  if (!warehouse) {
    throw new Error(`Warehouse with ID ${warehouseId} not found.`);
  }

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row = normalizeKeys(rawRow);
    const rowNum = i + 1;

    try {
      const { sku, barcode, quantity, location } = row;

      // Validation
      if (!sku && !barcode) throw new Error('Either SKU or Barcode is required.');
      if (quantity === undefined || quantity === '') throw new Error('Quantity is required.');
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 0) throw new Error('Quantity must be a non-negative integer.');

      // Find Product
      const productWhere = {};
      if (sku) productWhere.sku = sku;
      if (barcode) productWhere.barcode = barcode;

      const product = await Product.findOne({
        where: {
          [Op.or]: [
            sku ? { sku } : null,
            barcode ? { barcode } : null,
          ].filter(Boolean),
        },
      });

      if (!product) {
        throw new Error(`Product not found for SKU "${sku || ''}" or Barcode "${barcode || ''}".`);
      }

      // Upsert Inventory record
      const t = await sequelize.transaction();
      try {
        let inventory = await Inventory.findOne({
          where: { product_id: product.product_id, warehouse_id: warehouseId },
          transaction: t,
        });

        let isUpdated = false;
        let oldQty = 0;

        if (inventory) {
          oldQty = inventory.quantity;
          await inventory.update({
            quantity: qty,
            sku: product.sku,  // Maintain denormalized fields
            name: product.name,
            location: location || inventory.location || null,
          }, { transaction: t });
          isUpdated = true;
        } else {
          inventory = await Inventory.create({
            product_id: product.product_id,
            warehouse_id: warehouseId,
            sku: product.sku,  // Since these are NOT NULL in physical table
            name: product.name,
            quantity: qty,
            location: location || null,
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
            warehouse_id: warehouseId,
            old_quantity: oldQty,
            new_quantity: qty,
            location: location || null,
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
      const { name, location, address, capacity, manager_email } = row;

      // Validation
      if (!name) throw new Error('Warehouse Name is required.');
      if (!location) throw new Error('Location is required.');
      if (!capacity) throw new Error('Capacity is required.');
      const cap = parseFloat(capacity);
      if (isNaN(cap) || cap <= 0) throw new Error('Capacity must be a positive number.');

      let warehouse = await Warehouse.findOne({ where: { name } });
      let isUpdated = false;

      const t = await sequelize.transaction();
      try {
        if (warehouse) {
          // If updating, find manager or keep existing
          let finalManagerId = warehouse.manager_id;
          if (manager_email) {
            const manager = await User.findOne({ where: { email: manager_email }, transaction: t });
            if (manager) {
              finalManagerId = manager.id;
            }
          }

          await warehouse.update({
            location,
            address: address || warehouse.address || null,
            capacity: cap,
            manager_id: finalManagerId,
          }, { transaction: t });
          isUpdated = true;
        } else {
          // If creating new, find manager or fallback to triggeredBy user
          let finalManagerId = triggeredBy;
          if (manager_email) {
            const manager = await User.findOne({ where: { email: manager_email }, transaction: t });
            if (manager) {
              finalManagerId = manager.id;
            }
          }

          warehouse = await Warehouse.create({
            name,
            location,
            address: address || null,
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
