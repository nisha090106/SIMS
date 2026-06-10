import { 
  sequelize, 
  Product, 
  Warehouse, 
  Inventory, 
  BarcodeScanLog, 
  AuditLog, 
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

      // Find product by barcode
      const product = await Product.findOne({ where: { barcode } });

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
        where: { barcode },
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
}

export default BarcodeController;
