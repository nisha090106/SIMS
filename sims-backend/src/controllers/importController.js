import fs from 'fs';
import path from 'path';
import { ImportJob } from '../models/index.js';
import * as importService from '../services/importService.js';
import logger from '../config/logger.js';

/**
 * Handle multipart/form-data upload and trigger async bulk import.
 */
export const uploadAndImport = async (req, res, _next) => {
  let tempFilePath = null;

  try {
    const { import_type, warehouse_id } = req.body;
    
    // File validation
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    tempFilePath = req.file.path;

    // Validate import type
    const validImportTypes = ['product', 'stock', 'warehouse'];
    if (!validImportTypes.includes(import_type)) {
      throw new Error(`Invalid import_type: "${import_type}". Allowed values: product, stock, warehouse.`);
    }

    // Validate warehouse_id for stock imports
    if (import_type === 'stock' && !warehouse_id) {
      throw new Error('warehouse_id is required for stock imports.');
    }

    const fileType = path.extname(req.file.originalname).toLowerCase();
    
    // Parse the file to get rows and count total_rows before responding
    let rows;
    try {
      rows = importService.parseFile(tempFilePath, fileType);
    } catch (parseError) {
      throw new Error(`Failed to parse file: ${parseError.message}`);
    }

    if (!rows || rows.length === 0) {
      throw new Error('The uploaded file is empty or has no data rows.');
    }

    // Create the ImportJob record in 'pending' status
    const job = await ImportJob.create({
      job_type: `${import_type}_import`,
      file_name: req.file.originalname,
      status: 'pending',
      total_rows: rows.length,
      triggered_by: req.user.user_id,
    });

    // Respond immediately to the client
    res.status(202).json({
      success: true,
      message: 'Import started successfully.',
      jobId: job.id,
    });

    // Process processing asynchronously
    setImmediate(async () => {
      const jobId = job.id;
      logger.info(`Starting asynchronous processing for import job #${jobId} (${import_type})`);
      
      try {
        // Update job status to 'processing'
        await ImportJob.update({
          status: 'processing',
          started_at: new Date(),
        }, {
          where: { id: jobId },
        });

        // Run the appropriate import logic
        let summary;
        if (import_type === 'product') {
          summary = await importService.importProducts(rows, jobId, req.user.user_id);
        } else if (import_type === 'stock') {
          summary = await importService.importStock(rows, jobId, warehouse_id, req.user.user_id);
        } else if (import_type === 'warehouse') {
          summary = await importService.importWarehouses(rows, jobId, req.user.user_id);
        }

        logger.info(`Finished processing import job #${jobId}. Success: ${summary.created + summary.updated}, Failed: ${summary.failed}`);

        // Update job status to 'completed'
        await ImportJob.update({
          status: summary.failed > 0 && (summary.created + summary.updated === 0) ? 'failed' : 'completed',
          completed_at: new Date(),
        }, {
          where: { id: jobId },
        });

      } catch (procError) {
        logger.error(`Error processing import job #${jobId}: ${procError.message}`);
        
        await ImportJob.update({
          status: 'failed',
          completed_at: new Date(),
          error_log: JSON.stringify([{ error: procError.message }]),
        }, {
          where: { id: jobId },
        });
      } finally {
        // Clean up the temp uploaded file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlink(tempFilePath, (err) => {
            if (err) {
              logger.error(`Failed to delete temp file ${tempFilePath}: ${err.message}`);
            } else {
              logger.info(`Cleaned up temp import file: ${tempFilePath}`);
            }
          });
        }
      }
    });

  } catch (error) {
    // If we failed before database job creation, clean up upload file immediately
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        logger.error(`Failed to delete temp file on error: ${err.message}`);
      }
    }
    logger.error(`Import upload failed: ${error.message}`);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Get the status and progress of a specific import job.
 */
export const getImportJob = async (req, res, _next) => {
  try {
    const { jobId } = req.params;
    const job = await ImportJob.findByPk(jobId, {
      include: [
        {
          association: 'triggeredBy',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Import job not found.' });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error(`Get import job error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get import history, last 20 jobs with optional filters.
 */
export const getImportHistory = async (req, res, _next) => {
  try {
    const { import_type, status } = req.query;
    const where = {};

    if (import_type) {
      where.job_type = `${import_type}_import`;
    }
    
    if (status) {
      where.status = status;
    }

    const jobs = await ImportJob.findAll({
      where,
      include: [
        {
          association: 'triggeredBy',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error(`Get import history error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Download a CSV template for a specific import type.
 */
export const downloadTemplate = async (req, res, _next) => {
  try {
    const { type } = req.params;
    let headers = '';
    let sampleRow = '';
    let fileName = '';

    if (type === 'products') {
      headers = 'name,sku,category,unit,unit_price,reorder_level,reorder_qty,description,barcode';
      sampleRow = '\nWireless Mouse,MS-WIRE-01,Electronics,piece,25.99,15,50,Ergonomic 2.4Ghz wireless mouse,190128456012';
      fileName = 'products_import_template.csv';
    } else if (type === 'stock') {
      headers = 'sku,barcode,quantity,location';
      sampleRow = '\nMS-WIRE-01,190128456012,120,Rack A-3';
      fileName = 'stock_import_template.csv';
    } else if (type === 'warehouses') {
      headers = 'name,location,address,capacity,manager_email';
      sampleRow = '\nNorth Warehouse,New York,100 Logistics Blvd Suite 10,50000.00,manager@sims.com';
      fileName = 'warehouses_import_template.csv';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid template type. Must be products, stock, or warehouses.',
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(headers + sampleRow);
  } catch (error) {
    logger.error(`Download template error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};
