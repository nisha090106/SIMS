import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import logger from '../config/logger.js';
import {
  sequelize,
  ReorderRule, Inventory, Product, PurchaseOrder,
  Supplier, User, AutomationLog,
} from '../models/index.js';
import { autoCreatePO } from '../controllers/purchaseController.js';
import NotificationService from './notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the ID of the first admin user (fallback: 1). */
async function getAdminCreatorId() {
  const admin = await User.findOne({ where: { role: 'admin' }, attributes: ['id'] });
  return admin ? admin.id : 1;
}

/**
 * Safe helper: write a failed AutomationLog row without throwing.
 * Used in outer catch blocks so a logging failure never masks the real error.
 */
async function logFailure(jobName, message, durationMs) {
  try {
    await AutomationLog.create({
      job_name:         jobName,
      status:           'failed',
      summary:          message,
      records_affected: 0,
      duration_ms:      durationMs,
      ran_at:           new Date(),
    });
  } catch (logErr) {
    logger.error(`[CRON] Could not write failure log for ${jobName}: ${logErr.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 1 helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the list of products that need a reorder PO.
 *
 * Strategy:
 *   1. Fetch active reorder_rules with their products.
 *   2. If the reorder_rules table is EMPTY, fall back to a direct inventory
 *      LEFT-JOIN query that finds every product whose current quantity in any
 *      warehouse row is at or below products.reorder_level.
 *
 * Returns an array of work items:
 *   { product, lowStockItem, supplierId, threshold, reorderQty, warehouseId }
 */
async function buildLowStockWorkItems(openPOs) {
  const rules = await ReorderRule.findAll({
    where:   { is_active: true },
    include: [{ model: Product, as: 'product' }],
  });

  // ── Path A: reorder_rules populated ─────────────────────────────────────
  if (rules.length > 0) {
    const workItems = [];

    for (const rule of rules) {
      if (!rule.product) {
        logger.warn(`[LOW-STOCK] ReorderRule #${rule.id} has no associated product — skipping.`);
        continue;
      }

      const invWhere = { product_id: rule.product_id };
      if (rule.warehouse_id) invWhere.warehouse_id = rule.warehouse_id;

      const invRows   = await Inventory.findAll({ where: invWhere });
      const lowInvRow = invRows.find((inv) => inv.quantity <= rule.reorder_threshold);
      if (!lowInvRow) continue;

      const alreadyDrafted = openPOs.some((po) => {
        try {
          const items = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
          return items.some((i) => i.product_id === rule.product_id);
        } catch { return false; }
      });
      if (alreadyDrafted) {
        logger.info(`[LOW-STOCK] Skip Product ID ${rule.product_id}: auto-PO already open.`);
        continue;
      }

      workItems.push({
        rule,
        product:     rule.product,
        lowStockItem: lowInvRow,
        supplierId:  rule.preferred_supplier_id || null,
        threshold:   rule.reorder_threshold,
        reorderQty:  rule.reorder_quantity,
        warehouseId: rule.warehouse_id || null,
      });
    }
    return workItems;
  }

  // ── Path B: reorder_rules table is empty — fallback to direct query ──────
  logger.info('[LOW-STOCK] No active reorder rules found — falling back to direct inventory scan.');

  // Raw query: inventory rows where quantity <= product.reorder_level
  const rawRows = await sequelize.query(
    `SELECT i.id        AS inv_id,
            i.product_id,
            i.warehouse_id,
            i.quantity,
            p.reorder_level   AS threshold,
            p.reorder_qty     AS reorder_quantity,
            p.name            AS product_name,
            p.sku             AS product_sku,
            p.unit_price,
            p.cost_price
       FROM inventory i
       JOIN products   p ON p.product_id = i.product_id
      WHERE i.quantity <= p.reorder_level
        AND p.is_active = 1`,
    { type: sequelize.QueryTypes.SELECT },
  );

  // For each row build a minimal work item (no Rule object available)
  const workItems = [];
  const seen      = new Set();  // avoid duplicate product_id entries

  for (const row of rawRows) {
    if (seen.has(row.product_id)) continue;
    seen.add(row.product_id);

    // Skip if auto-PO already open
    const alreadyDrafted = openPOs.some((po) => {
      try {
        const items = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
        return items.some((i) => i.product_id === row.product_id);
      } catch { return false; }
    });
    if (alreadyDrafted) {
      logger.info(`[LOW-STOCK] Skip Product ID ${row.product_id}: auto-PO already open.`);
      continue;
    }

    workItems.push({
      rule:        null,                // no rule in fallback path
      product: {
        product_id: row.product_id,
        name:       row.product_name,
        sku:        row.product_sku,
        unit_price: row.unit_price,
        cost_price: row.cost_price,
      },
      lowStockItem: {
        product_id:   row.product_id,
        warehouse_id: row.warehouse_id,
        quantity:     row.quantity,
      },
      supplierId:  null,
      threshold:   row.threshold,
      reorderQty:  row.reorder_quantity,
      warehouseId: row.warehouse_id || null,
    });
  }
  return workItems;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED: runLowStockCheckerInline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core low-stock logic — called by the cron job and by the import controller.
 * The entire body is wrapped in try/catch; errors never silently disappear.
 */
export async function runLowStockCheckerInline() {
  logger.info('[LOW-STOCK] Starting inline low stock checker...');

  let recordsAffected  = 0;
  const triggeredProducts = [];
  const createdPOs        = [];

  try {
    const adminId = await getAdminCreatorId();

    // Fetch all open auto-drafted POs up front to avoid redundant POs
    const openPOs = await PurchaseOrder.findAll({
      where: { status: { [Op.in]: ['draft', 'submitted', 'approved'] }, auto_drafted: true },
    });

    const workItems = await buildLowStockWorkItems(openPOs);

    for (const item of workItems) {
      const { product, lowStockItem, warehouseId, threshold, reorderQty } = item;

      // Resolve supplier
      let supplierId = item.supplierId;
      if (!supplierId) {
        const supplier = await Supplier.findOne({ where: { status: 'active' }, order: [['supplier_id', 'ASC']] });
        supplierId = supplier ? supplier.supplier_id : null;
      }
      if (!supplierId) {
        logger.error(`[LOW-STOCK] No active supplier for Product ID ${product.product_id}. Skipping.`);
        continue;
      }

      const suggestedQty = Math.max(reorderQty, (threshold * 2) - lowStockItem.quantity);
      const unitCost     = parseFloat(product.cost_price || product.unit_price || 0);

      const poResult = await autoCreatePO({
        supplier_id:  supplierId,
        warehouse_id: warehouseId,
        product_id:   product.product_id,
        product_name: product.name,
        product_sku:  product.sku,
        unit_cost:    unitCost,
        quantity:     suggestedQty,
        notes:        `Auto-drafted: stock at ${lowStockItem.quantity}, threshold ${threshold}`,
        created_by:   adminId,
      });

      // Update rule.last_triggered_at if we came from Path A
      if (item.rule) {
        item.rule.last_triggered_at = new Date();
        await item.rule.save();
      }

      // Notify all admins — use first_name + last_name (never .full_name on raw obj)
      const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id', 'first_name', 'last_name'] });
      for (const admin of admins) {
        const adminName = `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || `User #${admin.id}`;
        await NotificationService.createNotification({
          userId:   admin.id,
          type:     'low_stock_auto_po',
          title:    '⚠️ Low Stock Alert',
          message:  `Auto PO drafted for ${product.name} — stock at ${lowStockItem.quantity}, threshold ${threshold}`,
          link:     '/purchase-orders',
          metadata: {
            product_id:       product.product_id,
            warehouse_id:     warehouseId,
            current_quantity: lowStockItem.quantity,
            reorder_level:    threshold,
            notified_admin:   adminName,
          },
        });
      }

      recordsAffected++;
      triggeredProducts.push(product.name);
      if (poResult?.po_id) createdPOs.push(poResult.po_id);
    }

    logger.info(`[LOW-STOCK] Inline check completed. Triggered: ${recordsAffected}`);
    return { triggered: recordsAffected, products: triggeredProducts, poIds: createdPOs };

  } catch (error) {
    logger.error('[LOW-STOCK] Inline low stock checker failed:', error);
    // Return the error so the caller (runLowStockChecker) can persist a failed log
    return { triggered: 0, products: [], poIds: [], error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED: runLowStockChecker  (cron wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export async function runLowStockChecker() {
  const startTime = Date.now();
  logger.info('[CRON] Starting lowStockChecker job...');

  try {
    const result   = await runLowStockCheckerInline();
    const duration = Date.now() - startTime;

    // If the inline runner caught an internal error, persist a failure log
    if (result.error) {
      await logFailure('low_stock_checker', `Job failed internally: ${result.error}`, duration);
      return { status: 'failed', error: result.error, duration };
    }

    const { triggered, products } = result;
    const summary = triggered > 0
      ? `Auto-created ${triggered} PO(s) for: ${products.join(', ')}`
      : 'Checked reorder rules. No low stock items triggered.';

    await AutomationLog.create({
      job_name:         'low_stock_checker',
      status:           'success',
      summary,
      records_affected: triggered,
      duration_ms:      duration,
      ran_at:           new Date(),
    });

    logger.info(`[CRON] lowStockChecker completed. ${summary}`);
    return { status: 'success', recordsAffected: triggered, summary, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[CRON] lowStockChecker failed (outer catch):', error);
    await logFailure('low_stock_checker', `Outer error: ${error.message}`, duration);
    return { status: 'failed', error: error.message, duration };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED: recalculateInventoryValues
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalculate inventory stock values and status flags.
 *
 * Fix: also covers products that have NO inventory rows at all
 * using a LEFT JOIN so they are recorded as out_of_stock.
 */
export async function recalculateInventoryValues() {
  // ── Step 1: process existing inventory rows ──────────────────────────────
  const inventoryItems = await Inventory.findAll({
    include: [{ model: Product, as: 'product' }],
  });

  let totalProducts   = 0;
  let totalStockValue = 0;
  let lowStockCount   = 0;
  let outOfStockCount = 0;
  const uniqueWarehouses    = new Set();
  const coveredProductIds   = new Set();

  for (const item of inventoryItems) {
    if (!item.product) continue;
    coveredProductIds.add(item.product_id);

    const unitPrice      = parseFloat(item.product.unit_price) || 0;
    const quantity       = item.quantity || 0;
    const itemStockValue = quantity * unitPrice;

    // Save stock_value snapshot (field may exist depending on migration state)
    try { item.stock_value = itemStockValue; } catch { /* field not present */ }

    totalProducts++;
    totalStockValue += itemStockValue;
    if (item.warehouse_id) uniqueWarehouses.add(item.warehouse_id);

    if (quantity === 0) {
      item.status = 'out_of_stock';
      outOfStockCount++;
    } else if (quantity <= (item.product.reorder_level || 0)) {
      item.status = 'low_stock';
      lowStockCount++;
    } else {
      item.status = 'available';
    }

    await item.save();
  }

  // ── Step 2: find products with NO inventory row at all ───────────────────
  // These are implicitly out_of_stock.
  const allProducts = await Product.findAll({ attributes: ['product_id', 'name', 'sku'] });
  const ghostProducts = allProducts.filter((p) => !coveredProductIds.has(p.product_id));

  if (ghostProducts.length > 0) {
    logger.info(`[INVENTORY] ${ghostProducts.length} product(s) have no inventory row — counted as out_of_stock.`);
    outOfStockCount  += ghostProducts.length;
    // Don't add them to totalProducts (they have no stock value to report)
  }

  return {
    totalProducts,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
    warehouseCount: uniqueWarehouses.size,
    ghostProductCount: ghostProducts.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED: runNightlyInventorySync  (cron wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export async function runNightlyInventorySync() {
  const startTime = Date.now();
  logger.info('[CRON] Starting nightlyInventorySync job...');

  try {
    const stats = await recalculateInventoryValues();
    const {
      totalProducts, totalStockValue, lowStockCount,
      outOfStockCount, warehouseCount, ghostProductCount,
    } = stats;

    const timestamp   = new Date();
    const duration    = Date.now() - startTime;
    const summaryData = {
      total_products:      totalProducts,
      total_stock_value:   totalStockValue,
      low_stock_count:     lowStockCount,
      out_of_stock_count:  outOfStockCount,
      warehouses_synced:   warehouseCount,
      products_no_inventory: ghostProductCount,
      timestamp,
    };

    await AutomationLog.create({
      job_name:         'nightly_sync',
      status:           'success',
      summary:          JSON.stringify(summaryData),
      records_affected: totalProducts,
      duration_ms:      duration,
      ran_at:           timestamp,
    });

    // Notify admins — use first_name + last_name, never .full_name
    const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id', 'first_name', 'last_name'] });
    for (const admin of admins) {
      await NotificationService.createNotification({
        userId:   admin.id,
        type:     'nightly_sync_summary',
        title:    '🌙 Nightly Sync Complete',
        message:  `Nightly sync: Value ₹${totalStockValue.toFixed(2)}, Low: ${lowStockCount}, Out: ${outOfStockCount}`,
        link:     '/reports',
        metadata: summaryData,
      });
    }

    logger.info('[CRON] nightlyInventorySync completed successfully.');
    return { status: 'success', summary: summaryData, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[CRON] nightlyInventorySync failed:', error);
    await logFailure('nightly_sync', `Sync failed: ${error.message}`, duration);
    return { status: 'failed', error: error.message, duration };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED: runCleanupTempFiles  (cron wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export async function runCleanupTempFiles() {
  const startTime = Date.now();
  logger.info('[CRON] Starting cleanupTempFiles job...');

  let filesDeleted = 0;

  try {
    const importsDir = path.join(process.cwd(), 'src', 'uploads', 'imports');

    // ── Ensure the directory exists ──────────────────────────────────────────
    if (!fs.existsSync(importsDir)) {
      fs.mkdirSync(importsDir, { recursive: true });
      const duration = Date.now() - startTime;
      const summary  = 'Uploads/imports directory did not exist — created it. Nothing to clean.';
      logger.info(`[CRON] cleanupTempFiles: ${summary}`);
      await AutomationLog.create({
        job_name:         'cleanup_temp_files',
        status:           'success',
        summary,
        records_affected: 0,
        duration_ms:      duration,
        ran_at:           new Date(),
      });
      return { status: 'success', filesDeleted: 0, summary, duration };
    }

    // ── Directory exists — delete stale files ────────────────────────────────
    const files  = fs.readdirSync(importsDir);
    const now    = Date.now();
    const cutoff = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filePath  = path.join(importsDir, file);
      const fileStat  = fs.statSync(filePath);
      if (fileStat.isFile() && (now - fileStat.mtimeMs) > cutoff) {
        fs.unlinkSync(filePath);
        filesDeleted++;
      }
    }

    const duration = Date.now() - startTime;
    const summary  = `Cleaned uploads/imports. Deleted ${filesDeleted} file(s) older than 24 h.`;

    await AutomationLog.create({
      job_name:         'cleanup_temp_files',
      status:           'success',
      summary,
      records_affected: filesDeleted,
      duration_ms:      duration,
      ran_at:           new Date(),
    });

    logger.info(`[CRON] cleanupTempFiles completed. ${summary}`);
    return { status: 'success', filesDeleted, summary, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[CRON] cleanupTempFiles failed:', error);
    await logFailure('cleanup_temp_files', `Cleanup failed: ${error.message}`, duration);
    return { status: 'failed', error: error.message, duration };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED: initCronJobs
// ─────────────────────────────────────────────────────────────────────────────

export function initCronJobs() {
  // Visible terminal confirmation that this function was actually called
  console.log('[CRON] Cron jobs initialized');
  logger.info('[CRON] Initializing scheduled cron jobs...');

  // JOB 1 — lowStockChecker: every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      await runLowStockChecker();
    } catch (err) {
      logger.error('[CRON] Unhandled error in scheduled lowStockChecker:', err);
    }
  });

  // JOB 2 — nightlyInventorySync: every night at 2am
  cron.schedule('0 2 * * *', async () => {
    try {
      await runNightlyInventorySync();
    } catch (err) {
      logger.error('[CRON] Unhandled error in scheduled nightlyInventorySync:', err);
    }
  });

  // JOB 3 — cleanupTempFiles: every night at 3am
  cron.schedule('0 3 * * *', async () => {
    try {
      await runCleanupTempFiles();
    } catch (err) {
      logger.error('[CRON] Unhandled error in scheduled cleanupTempFiles:', err);
    }
  });

  logger.info('[CRON] All 3 cron jobs registered successfully (low-stock @30min, nightly-sync @2am, cleanup @3am).');
}
