import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import logger from '../config/logger.js';
import {
  ReorderRule, Inventory, Product, PurchaseOrder,
  Supplier, User, AutomationLog,
} from '../models/index.js';
import { autoCreatePO } from '../controllers/purchaseController.js';
import NotificationService from './notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get first admin user ID for creator field
async function getAdminCreatorId() {
  const admin = await User.findOne({ where: { role: 'admin' } });
  return admin ? admin.id : 1;
}

/**
 * Recalculate inventory stock values and status flags
 * Called both by cron (nightly) and by import service (immediately)
 * @returns {Object} Summary stats: totalProducts, totalStockValue, lowStockCount, outOfStockCount
 */
export async function recalculateInventoryValues() {
  try {
    const inventoryItems = await Inventory.findAll({
      include: [{ model: Product, as: 'product' }],
    });

    let totalProducts = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const uniqueWarehouses = new Set();

    for (const item of inventoryItems) {
      if (!item.product) continue;
      
      const unitPrice = parseFloat(item.product.unit_price) || 0;
      const quantity = item.quantity || 0;
      
      // a. Recalculate total stock value (quantity * unit_price) — store as a snapshot
      const itemStockValue = quantity * unitPrice;
      item.stock_value = itemStockValue;
      
      // Update statistics
      totalProducts++;
      totalStockValue += itemStockValue;
      if (item.warehouse_id) {
        uniqueWarehouses.add(item.warehouse_id);
      }

      // b. Flag out_of_stock status
      if (quantity === 0) {
        item.status = 'out_of_stock';
        outOfStockCount++;
      }
      // c. Flag low_stock status
      else if (quantity > 0 && quantity <= item.reorder_level) {
        item.status = 'low_stock';
        lowStockCount++;
      }
      // d. Clear flag (set available) if above reorder_level
      else {
        item.status = 'available';
      }

      await item.save();
    }

    return {
      totalProducts,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      warehouseCount: uniqueWarehouses.size,
    };
  } catch (error) {
    logger.error('[INVENTORY] recalculateInventoryValues failed:', error);
    throw error;
  }
}

/**
 * Run low stock checker inline (used by import service)
 * @returns {Object} { triggered: count, products: [], poIds: [] }
 */
export async function runLowStockCheckerInline() {
  logger.info('[LOW-STOCK] Starting inline low stock checker...');
  
  let recordsAffected = 0;
  const triggeredProducts = [];
  const createdPOs = [];
  
  try {
    const adminId = await getAdminCreatorId();
    
    // 1. Query all active reorder rules
    const rules = await ReorderRule.findAll({
      where: { is_active: true },
      include: [{ model: Product, as: 'product' }],
    });

    // Get all open auto-drafted POs once to check for existing drafts
    const openPOs = await PurchaseOrder.findAll({
      where: {
        status: { [Op.in]: ['draft', 'submitted', 'approved'] },
        auto_drafted: true,
      },
    });

    for (const rule of rules) {
      if (!rule.product) {
        logger.warn(`[LOW-STOCK] ReorderRule #${rule.id} has no associated product.`);
        continue;
      }

      // 2. Find inventory records for this product (+ warehouse_id if set)
      const invWhere = { product_id: rule.product_id };
      if (rule.warehouse_id) {
        invWhere.warehouse_id = rule.warehouse_id;
      }

      const inventoryItems = await Inventory.findAll({ where: invWhere });
      
      // Check if any inventory item falls below threshold
      const lowStockItem = inventoryItems.find(inv => inv.quantity <= rule.reorder_threshold);

      if (lowStockItem) {
        const product_id = rule.product_id;

        // a. Check if an auto-drafted open PO already exists for this product
        const isAlreadyDrafted = openPOs.some(po => {
          try {
            const items = typeof po.items === 'string' ? JSON.parse(po.items) : po.items;
            return Array.isArray(items) && items.some(item => item.product_id === product_id);
          } catch (err) {
            return false;
          }
        });

        if (isAlreadyDrafted) {
          logger.info(`[LOW-STOCK] Skip PO creation for Product ID ${product_id}: PO already drafted.`);
          continue;
        }

        // b. Create a new PurchaseOrder using the shared helper
        // Determine supplier
        let supplierId = rule.preferred_supplier_id;
        if (!supplierId) {
          const firstSupplier = await Supplier.findOne({
            where: { status: 'active' },
            order: [['supplier_id', 'ASC']],
          });
          supplierId = firstSupplier ? firstSupplier.supplier_id : null;
        }

        if (!supplierId) {
          logger.error(`[LOW-STOCK] No active supplier found for Product ID ${product_id}. Cannot create PO.`);
          continue;
        }

        // Suggested qty = (reorderLevel * 2) - currentQty
        const suggestedQty = Math.max(rule.reorder_quantity, (rule.reorder_threshold * 2) - lowStockItem.quantity);
        const unitCost = parseFloat(rule.product.cost_price || rule.product.unit_price || 0);

        const poResult = await autoCreatePO({
          supplier_id:  supplierId,
          warehouse_id: rule.warehouse_id || null,
          product_id,
          product_name: rule.product.name,
          product_sku:  rule.product.sku,
          unit_cost:    unitCost,
          quantity:     suggestedQty,
          notes:        `Auto-drafted: stock at ${lowStockItem.quantity}, threshold ${rule.reorder_threshold}`,
          created_by:   adminId,
        });

        // Update rule last_triggered_at
        rule.last_triggered_at = new Date();
        await rule.save();

        // Create notifications for all admin users
        const admins = await User.findAll({ where: { role: 'admin' } });
        for (const admin of admins) {
          await NotificationService.createNotification({
            type: 'low_stock_auto_po',
            message: `Auto PO drafted for ${rule.product.name} — needs your approval`,
            product_id,
            warehouse_id: rule.warehouse_id || null,
            current_quantity: lowStockItem.quantity,
            reorder_level: rule.reorder_threshold,
          });
        }

        recordsAffected++;
        triggeredProducts.push(rule.product.name);
        if (poResult && poResult.purchase_order_id) {
          createdPOs.push(poResult.purchase_order_id);
        }
      }
    }

    logger.info(`[LOW-STOCK] Inline check completed. Triggered: ${recordsAffected}`);
    return { 
      triggered: recordsAffected, 
      products: triggeredProducts,
      poIds: createdPOs,
    };

  } catch (error) {
    logger.error('[LOW-STOCK] Inline low stock checker failed:', error);
    return { 
      triggered: 0, 
      products: [],
      poIds: [],
      error: error.message,
    };
  }
}

/**
 * JOB 1: lowStockChecker
 * Runs every 30 minutes. Checks active reorder rules and drafts POs if stock is low.
 */
export async function runLowStockChecker() {
  const startTime = Date.now();
  logger.info('[CRON] Starting lowStockChecker job...');

  try {
    // Use the inline low stock checker
    const result = await runLowStockCheckerInline();
    const { triggered, products } = result;

    const duration = Date.now() - startTime;
    const summary = triggered > 0
      ? `Auto-created ${triggered} PO(s) for products: ${products.join(', ')}`
      : 'Checked reorder rules. No low stock items triggered.';

    await AutomationLog.create({
      job_name: 'low_stock_checker',
      status: 'success',
      summary,
      records_affected: triggered,
      duration_ms: duration,
      ran_at: new Date(),
    });

    logger.info(`[CRON] lowStockChecker completed. ${summary}`);
    return { status: 'success', recordsAffected: triggered, summary, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[CRON] lowStockChecker failed:', error);

    await AutomationLog.create({
      job_name: 'low_stock_checker',
      status: 'failed',
      summary: `Job failed: ${error.message}`,
      records_affected: 0,
      duration_ms: duration,
      ran_at: new Date(),
    });

    return { status: 'failed', error: error.message, duration };
  }
}

/**
 * JOB 2: nightlyInventorySync
 * Runs every night at 2am.
 */
export async function runNightlyInventorySync() {
  const startTime = Date.now();
  logger.info('[CRON] Starting nightlyInventorySync job...');

  try {
    // Use the extracted recalculation function
    const stats = await recalculateInventoryValues();
    const { totalProducts, totalStockValue, lowStockCount, outOfStockCount, warehouseCount } = stats;

    const timestamp = new Date();
    const summaryData = {
      total_products: totalProducts,
      total_stock_value: totalStockValue,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      warehouses_synced: warehouseCount,
      timestamp,
    };

    const duration = Date.now() - startTime;

    // Write automation log
    await AutomationLog.create({
      job_name: 'nightly_sync',
      status: 'success',
      summary: JSON.stringify(summaryData),
      records_affected: totalProducts,
      duration_ms: duration,
      ran_at: timestamp,
    });

    // Send notification to admin users
    const admins = await User.findAll({ where: { role: 'admin' } });
    for (const admin of admins) {
      await NotificationService.createNotification({
        type: 'nightly_sync_summary',
        message: `Nightly summary: Value $${totalStockValue.toFixed(2)}, Low Stock: ${lowStockCount}, Out of Stock: ${outOfStockCount}`,
        product_id: null,
        warehouse_id: null,
        current_quantity: null,
        reorder_level: null,
      });
    }

    logger.info('[CRON] nightlyInventorySync completed successfully.');
    return { status: 'success', summary: summaryData, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[CRON] nightlyInventorySync failed:', error);

    await AutomationLog.create({
      job_name: 'nightly_sync',
      status: 'failed',
      summary: `Sync failed: ${error.message}`,
      records_affected: 0,
      duration_ms: duration,
      ran_at: new Date(),
    });

    return { status: 'failed', error: error.message, duration };
  }
}


/**
 * JOB 3: cleanupTempFiles
 * Runs every night at 3am. Deletes temp files older than 24 hours in uploads/imports.
 */
export async function runCleanupTempFiles() {
  const startTime = Date.now();
  logger.info('[CRON] Starting cleanupTempFiles job...');

  let filesDeleted = 0;
  
  try {
    const importsDir = path.join(process.cwd(), 'src', 'uploads', 'imports');
    
    if (fs.existsSync(importsDir)) {
      const files = fs.readdirSync(importsDir);
      const now = Date.now();
      const cutoff = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(importsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && (now - stats.mtimeMs > cutoff)) {
          fs.unlinkSync(filePath);
          filesDeleted++;
        }
      }
    }

    const duration = Date.now() - startTime;
    const summary = `Cleaned up imports directory. Deleted ${filesDeleted} temporary file(s).`;

    await AutomationLog.create({
      job_name: 'cleanup_temp_files',
      status: 'success',
      summary,
      records_affected: filesDeleted,
      duration_ms: duration,
      ran_at: new Date(),
    });

    logger.info(`[CRON] cleanupTempFiles completed. ${summary}`);
    return { status: 'success', filesDeleted, summary, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[CRON] cleanupTempFiles failed:', error);

    await AutomationLog.create({
      job_name: 'cleanup_temp_files',
      status: 'failed',
      summary: `Cleanup failed: ${error.message}`,
      records_affected: 0,
      duration_ms: duration,
      ran_at: new Date(),
    });

    return { status: 'failed', error: error.message, duration };
  }
}

/**
 * Registers scheduled cron jobs.
 */
export function initCronJobs() {
  logger.info('[CRON] Initializing scheduled cron jobs...');

  // lowStockChecker: runs every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      await runLowStockChecker();
    } catch (err) {
      logger.error('[CRON] Error during scheduled lowStockChecker:', err);
    }
  });

  // nightlyInventorySync: runs every night at 2am
  cron.schedule('0 2 * * *', async () => {
    try {
      await runNightlyInventorySync();
    } catch (err) {
      logger.error('[CRON] Error during scheduled nightlyInventorySync:', err);
    }
  });

  // cleanupTempFiles: runs every night at 3am
  cron.schedule('0 3 * * *', async () => {
    try {
      await runCleanupTempFiles();
    } catch (err) {
      logger.error('[CRON] Error during scheduled cleanupTempFiles:', err);
    }
  });

  logger.info('[CRON] Scheduled jobs successfully registered.');
}
