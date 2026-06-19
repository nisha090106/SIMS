import { 
  sequelize, 
  Product, 
  Warehouse, 
  Inventory, 
  BarcodeScanLog, 
  AuditLog, 
  UnknownBarcode,
} from '../models/index.js';
import { Op } from 'sequelize';
import notificationService from '../services/notificationService.js';
import logger from '../config/logger.js';
import { getClientIP } from '../utils/helpers.js';

export class BarcodeController {
  /**
   * Process a barcode scan.
   * Updates inventory, logs to scans and audits, and fires low stock notification if triggered.
   */
  static async scanBarcode(req, res, next) {
    try {
      const { barcode, warehouse_id, scan_type, notes } = req.body;
      const quantity = req.body.quantity !== undefined ? parseInt(req.body.quantity, 10) : 1;

      // Basic validations
      if (!barcode || barcode.trim() === '') {
        return res.status(400).json({ success: false, error: 'Barcode is required' });
      }
      if (!warehouse_id) {
        return res.status(400).json({ success: false, error: 'Warehouse ID is required' });
      }
      if (!['stock_in', 'stock_out', 'audit'].includes(scan_type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Scan type must be \'stock_in\', \'stock_out\', or \'audit\'', 
        });
      }
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, error: 'Quantity must be a positive integer' });
      }

      // Check if warehouse exists
      const warehouse = await Warehouse.findByPk(warehouse_id);
      if (!warehouse) {
        return res.status(400).json({ success: false, error: 'Warehouse not found' });
      }

      // Find product by barcode OR SKU (many products lack a barcode value)
      const product = await Product.findOne({
        where: { [Op.or]: [{ barcode }, { sku: barcode }] },
      });

      // Scenario: Product not recognised
      if (!product) {
        await BarcodeScanLog.create({
          barcode,
          product_id: null,
          warehouse_id,
          scan_type,
          quantity,
          scanned_by: req.user.user_id,
          processed: false,
          notes: notes || null,
        });

        logger.info(`Unrecognised barcode scanned: ${barcode} by user ${req.user.user_id}`);
        return res.status(200).json({
          success: true,
          found: false,
          barcode,
          message: 'Product not recognised. Scan logged.',
        });
      }

      // Scenario: Product found - update stock inside a transaction
      const t = await sequelize.transaction();
      try {
        let [inventory, created] = await Inventory.findOrCreate({
          where: { product_id: product.product_id, warehouse_id },
          defaults: {
            sku: product.sku,
            name: product.name,
            quantity: 0,
          },
          transaction: t,
        });

        const before_qty = inventory.quantity;
        let after_qty = before_qty;

        if (scan_type === 'stock_in') {
          after_qty = before_qty + quantity;
        } else if (scan_type === 'stock_out') {
          after_qty = before_qty - quantity;
          if (after_qty < 0) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              error: `Insufficient stock. Current stock: ${before_qty}, Attempted scan out: ${quantity}`,
            });
          }
        }

        if (scan_type !== 'audit') {
          await inventory.update({ quantity: after_qty }, { transaction: t });
        }

        // Create scan log record
        await BarcodeScanLog.create({
          barcode,
          product_id: product.product_id,
          warehouse_id,
          scan_type,
          quantity,
          scanned_by: req.user.user_id,
          processed: true,
          processed_at: new Date(),
          notes: notes || null,
        }, { transaction: t });

        // Log to audit log
        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'BARCODE_SCAN',
          table_name: 'inventory',
          changes: {
            scan_type,
            quantity,
            before: before_qty,
            after: after_qty,
          },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        // Check if reorder level hit
        if (after_qty <= product.reorder_level) {
          await notificationService.createNotification({
            type: 'low_stock',
            message: `Stock level for product ${product.name} (SKU: ${product.sku}) in warehouse ${warehouse.name} has hit the reorder level (${after_qty} left, reorder level is ${product.reorder_level}).`,
            product_id: product.product_id,
            warehouse_id,
            current_quantity: after_qty,
            reorder_level: product.reorder_level,
          }).catch((err) => logger.error('Failed to trigger low stock notification:', err));
        }

        logger.info(`Barcode scan processed for product ${product.sku} (scan_type: ${scan_type})`);
        return res.status(200).json({
          success: true,
          found: true,
          product: {
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
          },
          warehouse: {
            name: warehouse.name,
          },
          before_qty,
          after_qty,
          scan_type,
        });

      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }

    } catch (error) {
      logger.error(`Scan barcode error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Look up product details and inventory by barcode.
   */
  static async lookupBarcode(req, res, next) {
    try {
      const { barcode } = req.query;

      if (!barcode || barcode.trim() === '') {
        return res.status(400).json({ success: false, error: 'Barcode is required' });
      }

      const product = await Product.findOne({
        where: { [Op.or]: [{ barcode }, { sku: barcode }] },
        include: [
          {
            association: 'inventory',
            attributes: ['id', 'warehouse_id', 'quantity', 'location', 'batch_no', 'expiry_date'],
            include: [
              {
                association: 'warehouse',
                attributes: ['name'],
              },
            ],
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error(`Lookup barcode error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Fetch paginated history of barcode scans.
   */
  static async getScanHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const { warehouse_id, scan_type, date_from, date_to } = req.query;

      const where = {};
      if (warehouse_id) {
        where.warehouse_id = parseInt(warehouse_id, 10);
      }
      if (scan_type) {
        where.scan_type = scan_type;
      }
      if (date_from || date_to) {
        where.created_at = {};
        if (date_from) {
          where.created_at[Op.gte] = new Date(date_from);
        }
        if (date_to) {
          where.created_at[Op.lte] = new Date(date_to);
        }
      }

      const { count: total, rows: logs } = await BarcodeScanLog.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            association: 'product',
            attributes: ['product_id', 'sku', 'name', 'barcode'],
          },
          {
            association: 'scanner',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
          {
            association: 'warehouse',
            attributes: ['warehouse_id', 'name'],
          },
        ],
      });

      return res.status(200).json({
        success: true,
        data: {
          logs,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error(`Get scan history error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Fetch unrecognised barcode scans (where product_id is null).
   */
  static async processUnrecognisedScans(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const { count: total, rows: logs } = await BarcodeScanLog.findAndCountAll({
        where: { product_id: null },
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            association: 'scanner',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
          {
            association: 'warehouse',
            attributes: ['warehouse_id', 'name'],
          },
        ],
      });

      return res.status(200).json({
        success: true,
        data: {
          logs,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error(`Get unrecognised scans error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Link an unrecognised scan to a product.
   * Updates product barcode, updates scan log status, and processes the inventory changes.
   */
  static async linkScanToProduct(req, res, next) {
    try {
      const { scanId } = req.params;
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
      }

      // Check scan log
      const scanLog = await BarcodeScanLog.findByPk(scanId);
      if (!scanLog) {
        return res.status(404).json({ success: false, error: 'Scan log not found' });
      }
      if (scanLog.product_id !== null || scanLog.processed) {
        return res.status(400).json({ success: false, error: 'Scan log has already been processed' });
      }

      // Check product
      const product = await Product.findByPk(product_id);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      // Check if product or another product already has this barcode
      const existingBarcodeProduct = await Product.findOne({
        where: { barcode: scanLog.barcode },
      });
      if (existingBarcodeProduct && existingBarcodeProduct.product_id !== product.product_id) {
        return res.status(400).json({
          success: false,
          error: `Barcode '${scanLog.barcode}' is already linked to another product (SKU: ${existingBarcodeProduct.sku})`,
        });
      }

      // Check warehouse
      const warehouse = await Warehouse.findByPk(scanLog.warehouse_id);
      if (!warehouse) {
        return res.status(400).json({ success: false, error: 'Warehouse associated with scan not found' });
      }

      // Run transactional updates
      const t = await sequelize.transaction();
      try {
        // 1. Update product barcode
        await product.update({ barcode: scanLog.barcode }, { transaction: t });

        // 2. Find or create inventory
        let [inventory, created] = await Inventory.findOrCreate({
          where: { product_id: product.product_id, warehouse_id: scanLog.warehouse_id },
          defaults: {
            sku: product.sku,
            name: product.name,
            quantity: 0,
          },
          transaction: t,
        });

        const before_qty = inventory.quantity;
        let after_qty = before_qty;

        if (scanLog.scan_type === 'stock_in') {
          after_qty = before_qty + scanLog.quantity;
        } else if (scanLog.scan_type === 'stock_out') {
          after_qty = before_qty - scanLog.quantity;
          if (after_qty < 0) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              error: `Insufficient stock to complete stock-out. Current stock: ${before_qty}, Attempted: ${scanLog.quantity}`,
            });
          }
        }

        if (scanLog.scan_type !== 'audit') {
          await inventory.update({ quantity: after_qty }, { transaction: t });
        }

        // 3. Mark scan log as processed
        await scanLog.update({
          product_id: product.product_id,
          processed: true,
          processed_at: new Date(),
        }, { transaction: t });

        // 4. Log to audit log
        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'BARCODE_SCAN',
          table_name: 'inventory',
          changes: {
            scan_type: scanLog.scan_type,
            quantity: scanLog.quantity,
            before: before_qty,
            after: after_qty,
            linked_from_scan: scanLog.id,
          },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        // Check low stock warning
        if (after_qty <= product.reorder_level) {
          await notificationService.createNotification({
            type: 'low_stock',
            message: `Stock level for product ${product.name} (SKU: ${product.sku}) in warehouse ${warehouse.name} is low (${after_qty} left, reorder level is ${product.reorder_level}).`,
            product_id: product.product_id,
            warehouse_id: scanLog.warehouse_id,
            current_quantity: after_qty,
            reorder_level: product.reorder_level,
          }).catch((err) => logger.error('Failed to trigger low stock notification:', err));
        }

        logger.info(`Barcode linked and stock processed for log ${scanLog.id} to product ${product.sku}`);
        return res.status(200).json({
          success: true,
          message: 'Barcode linked and inventory processed successfully.',
          scanLog,
          product: {
            product_id: product.product_id,
            sku: product.sku,
            name: product.name,
            barcode: product.barcode,
          },
          before_qty,
          after_qty,
        });

      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }

    } catch (error) {
      logger.error(`Link barcode scan error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/barcodes/scan/:barcode
   * Lookup product by barcode, scoped to warehouse
   */
  static async scanLookup(req, res, next) {
    try {
      const { barcode } = req.params;
      const { warehouse_id } = req.query;

      if (!barcode || barcode.trim() === '') {
        return res.status(400).json({ success: false, error: 'Barcode is required' });
      }

      // Apply warehouse isolation for Manager/Staff
      let warehouseFilter = warehouse_id ? parseInt(warehouse_id, 10) : null;
      if (req.user.role === 'manager' || req.user.role === 'staff') {
        warehouseFilter = req.user.warehouse_id;
      }

      // Find product by barcode OR SKU
      const product = await Product.findOne({
        where: { [Op.or]: [{ barcode }, { sku: barcode }] },
      });

      if (!product) {
        // Create unknown barcode record
        await UnknownBarcode.create({
          barcode,
          scanned_at: new Date(),
          scanned_by: req.user.user_id,
          warehouse_id: warehouseFilter,
          action: 'stock_in', // default
          resolved: false,
        });

        return res.status(404).json({
          success: false,
          unknownBarcode: true,
          barcode,
          message: 'Barcode not recognized',
        });
      }

      // Get inventory for the warehouse
      const inventory = await Inventory.findOne({
        where: { product_id: product.product_id, warehouse_id: warehouseFilter },
      });

      return res.status(200).json({
        success: true,
        product: {
          product_id: product.product_id,
          sku: product.sku,
          name: product.name,
          barcode: product.barcode,
          unit: product.unit,
          image_url: product.image_url,
        },
        inventory: {
          current_qty: inventory ? inventory.quantity : 0,
          warehouse_id: warehouseFilter,
        },
      });
    } catch (error) {
      logger.error(`Scan lookup error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/barcodes/stock-in
   * Stock-in operation via barcode
   */
  static async stockIn(req, res, next) {
    try {
      const { barcode, quantity, warehouse_id, batch_no, expiry_date } = req.body;

      if (!barcode || !quantity || !warehouse_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Barcode, quantity, and warehouse_id are required' 
        });
      }

      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, error: 'Quantity must be positive' });
      }

      // Apply warehouse isolation
      let whId = parseInt(warehouse_id, 10);
      if (req.user.role === 'manager' || req.user.role === 'staff') {
        whId = req.user.warehouse_id;
      }

      // Find product by barcode OR SKU
      const product = await Product.findOne({
        where: { [Op.or]: [{ barcode }, { sku: barcode }] },
      });
      if (!product) {
        await UnknownBarcode.create({
          barcode,
          scanned_at: new Date(),
          scanned_by: req.user.user_id,
          warehouse_id: whId,
          action: 'stock_in',
          quantity: qty,
          resolved: false,
        });
        return res.status(404).json({ success: false, unknownBarcode: true });
      }

      const t = await sequelize.transaction();
      try {
        let [inventory] = await Inventory.findOrCreate({
          where: { product_id: product.product_id, warehouse_id: whId },
          defaults: { sku: product.sku, name: product.name, quantity: 0 },
          transaction: t,
        });

        const before_qty = inventory.quantity;
        const after_qty = before_qty + qty;

        await inventory.update(
          { quantity: after_qty, batch_no, expiry_date },
          { transaction: t }
        );

        await BarcodeScanLog.create({
          barcode,
          product_id: product.product_id,
          warehouse_id: whId,
          scan_type: 'stock_in',
          quantity: qty,
          scanned_by: req.user.user_id,
          processed: true,
          processed_at: new Date(),
        }, { transaction: t });

        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'BARCODE_SCAN',
          table_name: 'inventory',
          changes: { scan_type: 'stock_in', before: before_qty, after: after_qty, quantity: qty },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Stock-in via barcode: ${product.sku}, qty: ${qty}`);
        return res.status(200).json({
          success: true,
          message: 'Stock-in completed',
          product: { name: product.name, sku: product.sku },
          before_qty,
          after_qty,
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Stock-in error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/barcodes/stock-out
   * Stock-out operation via barcode
   */
  static async stockOut(req, res, next) {
    try {
      const { barcode, quantity, warehouse_id, reference_no } = req.body;

      if (!barcode || !quantity || !warehouse_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Barcode, quantity, and warehouse_id are required' 
        });
      }

      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, error: 'Quantity must be positive' });
      }

      // Apply warehouse isolation
      let whId = parseInt(warehouse_id, 10);
      if (req.user.role === 'manager' || req.user.role === 'staff') {
        whId = req.user.warehouse_id;
      }

      // Find product by barcode OR SKU
      const product = await Product.findOne({
        where: { [Op.or]: [{ barcode }, { sku: barcode }] },
      });
      if (!product) {
        await UnknownBarcode.create({
          barcode,
          scanned_at: new Date(),
          scanned_by: req.user.user_id,
          warehouse_id: whId,
          action: 'stock_out',
          quantity: qty,
          resolved: false,
        });
        return res.status(404).json({ success: false, unknownBarcode: true });
      }

      const t = await sequelize.transaction();
      try {
        const inventory = await Inventory.findOne({
          where: { product_id: product.product_id, warehouse_id: whId },
        });

        const before_qty = inventory ? inventory.quantity : 0;
        if (before_qty < qty) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: `Insufficient stock. Current: ${before_qty}, Requested: ${qty}`,
          });
        }

        const after_qty = before_qty - qty;

        if (inventory) {
          await inventory.update({ quantity: after_qty }, { transaction: t });
        }

        await BarcodeScanLog.create({
          barcode,
          product_id: product.product_id,
          warehouse_id: whId,
          scan_type: 'stock_out',
          quantity: qty,
          scanned_by: req.user.user_id,
          processed: true,
          processed_at: new Date(),
          notes: reference_no ? `Reference: ${reference_no}` : null,
        }, { transaction: t });

        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'BARCODE_SCAN',
          table_name: 'inventory',
          changes: { scan_type: 'stock_out', before: before_qty, after: after_qty, quantity: qty },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Stock-out via barcode: ${product.sku}, qty: ${qty}`);
        return res.status(200).json({
          success: true,
          message: 'Stock-out completed',
          product: { name: product.name, sku: product.sku },
          before_qty,
          after_qty,
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Stock-out error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/barcodes/audit
   * Audit operation via barcode (compare with system qty)
   */
  static async audit(req, res, next) {
    try {
      const { barcode, counted_quantity, warehouse_id } = req.body;

      if (!barcode || counted_quantity === undefined || !warehouse_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Barcode, counted_quantity, and warehouse_id are required' 
        });
      }

      const counted_qty = parseInt(counted_quantity, 10);
      if (isNaN(counted_qty) || counted_qty < 0) {
        return res.status(400).json({ success: false, error: 'Counted quantity must be non-negative' });
      }

      // Apply warehouse isolation
      let whId = parseInt(warehouse_id, 10);
      if (req.user.role === 'manager' || req.user.role === 'staff') {
        whId = req.user.warehouse_id;
      }

      // Find product by barcode OR SKU
      const product = await Product.findOne({
        where: { [Op.or]: [{ barcode }, { sku: barcode }] },
      });
      if (!product) {
        return res.status(404).json({ success: false, unknownBarcode: true });
      }

      const t = await sequelize.transaction();
      try {
        const inventory = await Inventory.findOne({
          where: { product_id: product.product_id, warehouse_id: whId },
        });

        const system_qty = inventory ? inventory.quantity : 0;
        const variance = counted_qty - system_qty;

        await BarcodeScanLog.create({
          barcode,
          product_id: product.product_id,
          warehouse_id: whId,
          scan_type: 'audit',
          quantity: counted_qty,
          scanned_by: req.user.user_id,
          processed: true,
          processed_at: new Date(),
          notes: `Audit variance: ${variance}`,
        }, { transaction: t });

        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'BARCODE_SCAN',
          table_name: 'inventory',
          changes: { scan_type: 'audit', system_qty, counted_qty, variance },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Audit via barcode: ${product.sku}, variance: ${variance}`);
        return res.status(200).json({
          success: true,
          message: 'Audit recorded',
          product: { name: product.name, sku: product.sku },
          system_qty,
          counted_qty,
          variance,
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Audit error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/barcodes/unknown
   * Get all unknown barcodes (Admin) or by warehouse (Manager)
   */
  static async getUnknownBarcodes(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const where = { resolved: false };

      // Manager sees only their warehouse
      if (req.user.role === 'manager') {
        where.warehouse_id = req.user.warehouse_id;
      }

      const { count: total, rows: unknownBarcodes } = await UnknownBarcode.findAndCountAll({
        where,
        limit,
        offset,
        order: [['scanned_at', 'DESC']],
        include: [
          { association: 'scanner', attributes: ['id', 'email', 'first_name', 'last_name'] },
          { association: 'warehouse', attributes: ['warehouse_id', 'name'] },
        ],
      });

      return res.status(200).json({
        success: true,
        data: {
          unknownBarcodes,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error(`Get unknown barcodes error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/barcodes/unknown/:id/assign
   * Assign unknown barcode to a product
   */
  static async assignUnknownBarcode(req, res, next) {
    try {
      const { id } = req.params;
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
      }

      const unknownBarcode = await UnknownBarcode.findByPk(id);
      if (!unknownBarcode) {
        return res.status(404).json({ success: false, error: 'Unknown barcode record not found' });
      }

      if (unknownBarcode.resolved) {
        return res.status(400).json({ success: false, error: 'This barcode has already been resolved' });
      }

      const product = await Product.findByPk(product_id);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      // Check if barcode is already assigned to another product
      const existingBarcodeProduct = await Product.findOne({
        where: { barcode: unknownBarcode.barcode, product_id: { [Op.ne]: product_id } },
      });
      if (existingBarcodeProduct) {
        return res.status(400).json({
          success: false,
          error: `Barcode already assigned to product ${existingBarcodeProduct.sku}`,
        });
      }

      const t = await sequelize.transaction();
      try {
        // 1. Update product with barcode
        await product.update({ barcode: unknownBarcode.barcode }, { transaction: t });

        // 2. Find or create inventory and process the operation
        let [inventory] = await Inventory.findOrCreate({
          where: { product_id: product.product_id, warehouse_id: unknownBarcode.warehouse_id },
          defaults: { sku: product.sku, name: product.name, quantity: 0 },
          transaction: t,
        });

        const before_qty = inventory.quantity;
        let after_qty = before_qty;

        if (unknownBarcode.action === 'stock_in') {
          after_qty = before_qty + unknownBarcode.quantity;
        } else if (unknownBarcode.action === 'stock_out') {
          after_qty = before_qty - unknownBarcode.quantity;
          if (after_qty < 0) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              error: `Insufficient stock. Current: ${before_qty}, Requested: ${unknownBarcode.quantity}`,
            });
          }
        }

        if (unknownBarcode.action !== 'audit') {
          await inventory.update({ quantity: after_qty }, { transaction: t });
        }

        // 3. Mark unknown barcode as resolved
        await unknownBarcode.update({
          product_id: product.product_id,
          resolved: true,
          resolved_at: new Date(),
          resolved_by: req.user.user_id,
        }, { transaction: t });

        // 4. Create audit log
        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'BARCODE_SCAN',
          table_name: 'inventory',
          changes: {
            action: 'assign_unknown_barcode',
            barcode: unknownBarcode.barcode,
            product_id: product.product_id,
            before: before_qty,
            after: after_qty,
          },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Unknown barcode assigned: ${unknownBarcode.barcode} -> ${product.sku}`);
        return res.status(200).json({
          success: true,
          message: 'Unknown barcode successfully assigned and processed',
          product: { product_id, sku: product.sku, name: product.name },
          before_qty,
          after_qty,
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Assign unknown barcode error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/barcodes/generate
   * Generate barcode for a product
   */
  static async generateBarcode(req, res, next) {
    try {
      const { product_id } = req.query;

      if (!product_id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
      }

      const product = await Product.findByPk(product_id);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      // Generate a barcode (using product_id or SKU)
      // Format: SIMS-[product_id]-[timestamp]
      const barcode = `SIMS${product.product_id.toString().padStart(6, '0')}`;

      return res.status(200).json({
        success: true,
        product: {
          product_id: product.product_id,
          sku: product.sku,
          name: product.name,
        },
        barcode,
        message: 'Barcode generated',
      });
    } catch (error) {
      logger.error(`Generate barcode error: ${error.message}`);
      next(error);
    }
  }
}

export default BarcodeController;
