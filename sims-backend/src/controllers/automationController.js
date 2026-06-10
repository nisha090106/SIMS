import { Op } from 'sequelize';
import {
  AutomationLog,
  ReorderRule,
  Product,
  Supplier,
  Warehouse,
} from '../models/index.js';
import {
  runLowStockChecker,
  runNightlyInventorySync,
  runCleanupTempFiles,
} from '../services/cronService.js';

/**
 * GET /api/automation/logs
 * Retrieve automation execution logs (Admin only)
 */
export const getAutomationLogs = async (req, res) => {
  try {
    const { job_name, status, date_from, date_to, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (job_name) {
      where.job_name = job_name;
    }

    if (status) {
      where.status = status;
    }

    if (date_from || date_to) {
      where.ran_at = {};
      if (date_from) {
        where.ran_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.ran_at[Op.lte] = new Date(date_to);
      }
    }

    const { count, rows } = await AutomationLog.findAndCountAll({
      where,
      order: [['ran_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.status(200).json({
      success: true,
      data: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching automation logs:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch automation logs' });
  }
};

/**
 * GET /api/automation/reorder-rules
 * Retrieve reorder rules with product, supplier, and warehouse details (Admin, Manager)
 */
export const getReorderRules = async (req, res) => {
  try {
    const { product_id, is_active } = req.query;
    
    const where = {};
    if (product_id) {
      where.product_id = product_id;
    }
    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === '1';
    }

    const rules = await ReorderRule.findAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['name'],
        },
        {
          model: Supplier,
          as: 'preferredSupplier',
          attributes: ['name'],
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['name'],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('Error fetching reorder rules:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch reorder rules' });
  }
};

/**
 * POST /api/automation/reorder-rules
 * Create a new reorder rule (Admin, Manager)
 */
export const createReorderRule = async (req, res) => {
  try {
    const {
      product_id,
      warehouse_id,
      reorder_threshold,
      reorder_quantity,
      preferred_supplier_id,
      is_active = true,
    } = req.body;

    if (!product_id || reorder_threshold === undefined || reorder_quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'product_id, reorder_threshold, and reorder_quantity are required',
      });
    }

    // Verify product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ success: false, error: `Product with ID ${product_id} not found` });
    }

    // Enforce uniqueness constraint (one rule per product)
    const existingRule = await ReorderRule.findOne({ where: { product_id } });
    if (existingRule) {
      return res.status(400).json({
        success: false,
        error: `A reorder rule already exists for product with ID ${product_id}`,
      });
    }

    // Verify preferred supplier if provided
    if (preferred_supplier_id) {
      const supplier = await Supplier.findByPk(preferred_supplier_id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: `Supplier with ID ${preferred_supplier_id} not found` });
      }
    }

    // Verify warehouse if provided
    if (warehouse_id) {
      const warehouse = await Warehouse.findByPk(warehouse_id);
      if (!warehouse) {
        return res.status(404).json({ success: false, error: `Warehouse with ID ${warehouse_id} not found` });
      }
    }

    const newRule = await ReorderRule.create({
      product_id,
      warehouse_id: warehouse_id || null,
      reorder_threshold,
      reorder_quantity,
      preferred_supplier_id: preferred_supplier_id || null,
      is_active,
    });

    return res.status(201).json({
      success: true,
      message: 'Reorder rule created successfully',
      data: newRule,
    });
  } catch (error) {
    console.error('Error creating reorder rule:', error);
    return res.status(500).json({ success: false, error: 'Failed to create reorder rule' });
  }
};

/**
 * PUT /api/automation/reorder-rules/:id
 * Update an existing reorder rule (Admin, Manager)
 */
export const updateReorderRule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_id,
      warehouse_id,
      reorder_threshold,
      reorder_quantity,
      preferred_supplier_id,
      is_active,
    } = req.body;

    const rule = await ReorderRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Reorder rule not found' });
    }

    if (product_id && product_id !== rule.product_id) {
      // Verify product exists
      const product = await Product.findByPk(product_id);
      if (!product) {
        return res.status(404).json({ success: false, error: `Product with ID ${product_id} not found` });
      }

      // Enforce unique constraint
      const existingRule = await ReorderRule.findOne({ where: { product_id } });
      if (existingRule && existingRule.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          error: `A reorder rule already exists for product with ID ${product_id}`,
        });
      }
      rule.product_id = product_id;
    }

    if (warehouse_id !== undefined) {
      if (warehouse_id) {
        const warehouse = await Warehouse.findByPk(warehouse_id);
        if (!warehouse) {
          return res.status(404).json({ success: false, error: `Warehouse with ID ${warehouse_id} not found` });
        }
      }
      rule.warehouse_id = warehouse_id || null;
    }

    if (preferred_supplier_id !== undefined) {
      if (preferred_supplier_id) {
        const supplier = await Supplier.findByPk(preferred_supplier_id);
        if (!supplier) {
          return res.status(404).json({ success: false, error: `Supplier with ID ${preferred_supplier_id} not found` });
        }
      }
      rule.preferred_supplier_id = preferred_supplier_id || null;
    }

    if (reorder_threshold !== undefined) {
      rule.reorder_threshold = reorder_threshold;
    }

    if (reorder_quantity !== undefined) {
      rule.reorder_quantity = reorder_quantity;
    }

    if (is_active !== undefined) {
      rule.is_active = is_active;
    }

    await rule.save();

    return res.status(200).json({
      success: true,
      message: 'Reorder rule updated successfully',
      data: rule,
    });
  } catch (error) {
    console.error('Error updating reorder rule:', error);
    return res.status(500).json({ success: false, error: 'Failed to update reorder rule' });
  }
};

/**
 * PATCH /api/automation/reorder-rules/:id/toggle
 * Toggle active status of a reorder rule (Admin, Manager)
 */
export const toggleReorderRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await ReorderRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Reorder rule not found' });
    }

    rule.is_active = !rule.is_active;
    await rule.save();

    return res.status(200).json({
      success: true,
      message: `Reorder rule status toggled to ${rule.is_active ? 'active' : 'inactive'}`,
      data: rule,
    });
  } catch (error) {
    console.error('Error toggling reorder rule:', error);
    return res.status(500).json({ success: false, error: 'Failed to toggle reorder rule' });
  }
};

/**
 * POST /api/automation/trigger/:jobName
 * Trigger a job manually immediately (Admin only)
 */
export const triggerJobManually = async (req, res) => {
  try {
    const { jobName } = req.params;

    if (jobName === 'low_stock_checker') {
      const result = await runLowStockChecker();
      return res.status(200).json({
        success: true,
        message: 'Job triggered',
        result,
      });
    } else if (jobName === 'nightly_sync') {
      const result = await runNightlyInventorySync();
      return res.status(200).json({
        success: true,
        message: 'Job triggered',
        result,
      });
    } else if (jobName === 'cleanup_temp_files') {
      const result = await runCleanupTempFiles();
      return res.status(200).json({
        success: true,
        message: 'Job triggered',
        result,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid jobName. Must be \'low_stock_checker\', \'nightly_sync\', or \'cleanup_temp_files\'',
      });
    }
  } catch (error) {
    console.error('Error triggering job manually:', error);
    return res.status(500).json({ success: false, error: 'Failed to trigger job manually' });
  }
};
