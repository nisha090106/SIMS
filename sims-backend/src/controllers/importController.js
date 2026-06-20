import fs from 'fs';
import path from 'path';
import { ImportJob, Warehouse } from '../models/index.js';
import * as importService from '../services/importService.js';
import * as cronService from '../services/cronService.js';
import logger from '../config/logger.js';

/* ── helpers ─────────────────────────────────────────────────── */
const uid = (req) => req.user?.user_id || req.user?.id;

/**
 * Resolve the warehouse ID for manager/staff:
 * - Admin:   uses warehouse_id from body (optional)
 * - Manager: auto-assigned to their managed warehouse
 */
async function resolveWarehouseId(req, bodyWarehouseId) {
  const role = req.user?.role;
  if (role === 'admin') return bodyWarehouseId || null;

  // Manager / Staff: find their first managed warehouse
  const wh = await Warehouse.findOne({ where: { manager_id: uid(req) } });
  return wh ? wh.warehouse_id : null;
}

/* ═══════════════════════════════════════════════════════════════
   Core upload + async process handler
   Used by all three import endpoints
═══════════════════════════════════════════════════════════════ */
async function handleImport(req, res, importType) {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    tempFilePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();

    // Parse file into rows
    let rows;
    try {
      rows = importService.parseFile(tempFilePath, fileType);
    } catch (parseErr) {
      throw new Error(`File parse failed: ${parseErr.message}`);
    }

    if (!rows || rows.length === 0) {
      throw new Error('The uploaded file is empty or contains no data rows.');
    }

    // Resolve warehouse (needed for inventory import)
    let warehouseId = null;
    if (importType === 'stock') {
      warehouseId = await resolveWarehouseId(req, req.body.warehouse_id);
      if (!warehouseId) {
        throw new Error('A warehouse must be selected (or assigned to your account) for inventory imports.');
      }
    }

    // Create ImportJob record
    const job = await ImportJob.create({
      job_type:     `${importType}_import`,
      file_name:    req.file.originalname,
      status:       'pending',
      total_rows:   rows.length,
      triggered_by: uid(req),
    });

    // Respond 202 immediately
    res.status(202).json({
      success: true,
      message: 'Import queued.',
      jobId:   job.id,
      total:   rows.length,
    });

    // Process async
    setImmediate(async () => {
      const jobId = job.id;
      logger.info(`[IMPORT] Starting job #${jobId} type=${importType}`);

      try {
        await ImportJob.update({ status: 'processing', started_at: new Date() }, { where: { id: jobId } });

        let summary;
        if (importType === 'product') {
          summary = await importService.importProducts(rows, jobId, uid(req));
        } else if (importType === 'stock') {
          summary = await importService.importStock(rows, jobId, warehouseId, uid(req));
          
          // After successful stock import, run post-import hooks
          if (summary.created > 0 || summary.updated > 0) {
            try {
              // 1. Recalculate inventory values immediately (don't wait for 2AM cron)
              logger.info(`[IMPORT] Recalculating inventory values for ${summary.importedProductIds?.length || 0} products...`);
              await cronService.recalculateInventoryValues();

              // 2. Run low stock checker inline (don't wait 30 minutes)
              logger.info('[IMPORT] Running inline low stock checker...');
              const lowStockResult = await cronService.runLowStockCheckerInline();
              
              // Attach results to summary
              summary.lowStockTriggered = lowStockResult.triggered;
              summary.lowStockProducts = lowStockResult.products;
              summary.lowStockPOs = lowStockResult.poIds;
            } catch (hookErr) {
              logger.error('[IMPORT] Post-import hooks failed:', hookErr);
              // Don't fail the import just because hooks failed
            }
          }
        } else if (importType === 'warehouse') {
          summary = await importService.importWarehouses(rows, jobId, uid(req));
        } else if (importType === 'supplier') {
          summary = await importService.importSuppliers(rows, jobId, uid(req));
        }

        const allFailed = summary.failed > 0 && (summary.created + summary.updated === 0);
        
        // Store enhanced summary in ImportJob for retrieval
        const jobUpdateData = {
          status:       allFailed ? 'failed' : 'completed',
          completed_at: new Date(),
        };
        
        // If stock import, store additional metadata
        if (importType === 'stock') {
          jobUpdateData.metadata = JSON.stringify({
            lowStockTriggered: summary.lowStockTriggered || 0,
            barcodesMissing: summary.barcodesMissing || 0,
            importedProductIds: summary.importedProductIds || [],
            lowStockProducts: summary.lowStockProducts || [],
            lowStockPOs: summary.lowStockPOs || [],
          });
        }
        
        await ImportJob.update(jobUpdateData, { where: { id: jobId } });

        logger.info(`[IMPORT] Job #${jobId} done. created=${summary.created} updated=${summary.updated} failed=${summary.failed} lowStockTriggered=${summary.lowStockTriggered || 0} barcodesMissing=${summary.barcodesMissing || 0}`);
      } catch (procErr) {
        logger.error(`[IMPORT] Job #${jobId} processing error: ${procErr.message}`);
        await ImportJob.update({
          status:       'failed',
          completed_at: new Date(),
          error_log:    JSON.stringify([{ error: procErr.message }]),
        }, { where: { id: jobId } });
      } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlink(tempFilePath, (e) => {
            if (e) logger.error(`Failed to delete temp file: ${e.message}`);
          });
        }
      }
    });

  } catch (err) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }
    logger.error(`[IMPORT] Upload failed: ${err.message}`);
    res.status(400).json({ success: false, error: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════
   Route handlers
═══════════════════════════════════════════════════════════════ */
export const importProducts   = (req, res) => handleImport(req, res, 'product');
export const importInventory  = (req, res) => handleImport(req, res, 'stock');
export const importWarehouses = (req, res) => handleImport(req, res, 'warehouse');
export const importSuppliers  = (req, res) => handleImport(req, res, 'supplier');

// Legacy unified endpoint — kept for backward compat
export const uploadAndImport = async (req, res) => {
  const typeMap = { product: 'product', stock: 'stock', warehouse: 'warehouse', supplier: 'supplier' };
  const t = typeMap[req.body?.import_type];
  if (!t) return res.status(400).json({ success: false, error: 'Invalid import_type.' });
  return handleImport(req, res, t);
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/imports/:jobId   — job status + progress
═══════════════════════════════════════════════════════════════ */
export const getImportJob = async (req, res) => {
  try {
    const job = await ImportJob.findByPk(req.params.jobId, {
      include: [{ association: 'triggeredBy', attributes: ['id', 'first_name', 'last_name', 'email'] }],
    });
    if (!job) return res.status(404).json({ success: false, error: 'Import job not found.' });

    // Parse error_log JSON safely
    let errorLog = null;
    if (job.error_log) {
      try { errorLog = typeof job.error_log === 'string' ? JSON.parse(job.error_log) : job.error_log; }
      catch { errorLog = [{ error: job.error_log }]; }
    }

    // Parse metadata JSON safely
    let metadata = null;
    if (job.metadata) {
      try { metadata = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata; }
      catch { metadata = null; }
    }

    return res.json({
      success: true,
      data: {
        ...job.toJSON(),
        error_log: errorLog,
        metadata: metadata,
        progress_pct: job.total_rows > 0
          ? Math.min(100, Math.round(((job.processed_rows + job.failed_rows) / job.total_rows) * 100))
          : job.status === 'completed' ? 100 : 0,
      },
    });
  } catch (err) {
    logger.error(`getImportJob: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/imports   — history (last 30)
═══════════════════════════════════════════════════════════════ */
export const getImportHistory = async (req, res) => {
  try {
    const where = {};
    if (req.query.import_type) where.job_type = `${req.query.import_type}_import`;
    if (req.query.status)      where.status    = req.query.status;

    const jobs = await ImportJob.findAll({
      where,
      include: [{ association: 'triggeredBy', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: 30,
    });

    return res.json({
      success: true,
      data: jobs.map((j) => {
        let errorLog = null;
        if (j.error_log) {
          try { errorLog = typeof j.error_log === 'string' ? JSON.parse(j.error_log) : j.error_log; }
          catch { errorLog = [{ error: j.error_log }]; }
        }
        return { ...j.toJSON(), error_log: errorLog };
      }),
    });
  } catch (err) {
    logger.error(`getImportHistory: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/imports/template/:type   — download CSV template
═══════════════════════════════════════════════════════════════ */
export const downloadTemplate = (req, res) => {
  const TEMPLATES = {
    products: {
      file: 'products_import_template.csv',
      // Columns matching the task spec
      content: [
        'Name,SKU,Barcode,Category,Unit,ReorderLevel,CostPrice,SellingPrice,Description',
        'Wireless Mouse,MS-WIRE-01,190128456012,Electronics,piece,15,18.00,25.99,Ergonomic 2.4GHz wireless mouse',
        'USB-C Hub,HUB-UC-05,190128456088,Electronics,piece,10,30.00,45.00,5-in-1 multiport adapter',
      ].join('\n'),
    },
    inventory: {
      file: 'inventory_import_template.csv',
      content: [
        'SKU,WarehouseCode,Quantity,BatchNumber,ExpiryDate,StorageLocation',
        'MS-WIRE-01,WH-MUM,120,BATCH-2026-01,2027-12-31,Rack A-3',
        'HUB-UC-05,WH-DEL,85,BATCH-2026-02,,Bin B-12',
      ].join('\n'),
    },
    // Legacy alias
    stock: {
      file: 'stock_import_template.csv',
      content: [
        'SKU,WarehouseCode,Quantity,BatchNumber,ExpiryDate,StorageLocation',
        'MS-WIRE-01,WH-MUM,120,BATCH-2026-01,2027-12-31,Rack A-3',
      ].join('\n'),
    },
    warehouses: {
      file: 'warehouses_import_template.csv',
      content: [
        'Name,Code,Address,City,Country,ManagerEmail,Capacity',
        'North Warehouse,WH-MUM,100 Logistics Blvd Suite 10,Mumbai,India,manager@sims.com,50000',
        'Central Depot,WH-DEL,550 Interstate Ave,Delhi,India,depot@sims.com,120000',
      ].join('\n'),
    },
    suppliers: {
      file: 'suppliers_import_template.csv',
      content: [
        // Columns: name, contact_person, email, phone, address, payment_terms, lead_time, rating
        // payment_terms allowed values: Net 30 | Net 60 | Net 15 | Immediate
        // lead_time: integer 3–30 (days)
        // rating: float 1–5 (leave blank if unrated)
        'name,contact_person,email,phone,address,payment_terms,lead_time,rating',
        'Acme Supplies Pvt Ltd,Raj Sharma,raj@acme.in,9876543210,"12 Industrial Area, Pune",Net 30,7,4.5',
        'Global Traders Co,Priya Patel,priya@globaltraders.com,9123456789,"45 Commerce St, Mumbai",Net 60,14,3.8',
        'Swift Logistics,Anil Kumar,anil@swiftlog.in,9988776655,"8 Warehouse Lane, Delhi",Immediate,3,',
      ].join('\n'),
    },
  };

  const tpl = TEMPLATES[req.params.type];
  if (!tpl) {
    return res.status(400).json({
      success: false,
      error: `Invalid template type. Valid: ${Object.keys(TEMPLATES).join(', ')}`,
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${tpl.file}"`);
  res.status(200).send(tpl.content);
};
