import { Op } from 'sequelize';
import { Supplier, PurchaseOrder, AuditLog, User } from '../models/index.js';
import logger from '../config/logger.js';

export class SupplierController {
  // Get all suppliers with pagination, search, and status filter
  static async getSuppliers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const { search, status } = req.query;

      const where = {};

      // Search filter (name, email, contact_person)
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { contact_person: { [Op.like]: `%${search}%` } },
        ];
      }

      // Status filter
      if (status && status !== 'all') {
        where.status = status;
      }

      const { count: total, rows: suppliers } = await Supplier.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true,
      });

      // Fetch additional data for each supplier
      const suppliersWithDetails = await Promise.all(
        suppliers.map(async (supplier) => {
          const purchaseOrders = await PurchaseOrder.findAll({
            where: { supplier_id: supplier.supplier_id },
            attributes: ['po_id', 'order_date'],
            order: [['order_date', 'DESC']],
            limit: 1,
          });

          const totalOrders = await PurchaseOrder.count({
            where: { supplier_id: supplier.supplier_id },
          });

          const lastOrderDate = purchaseOrders.length > 0 ? purchaseOrders[0].order_date : null;

          return {
            ...supplier.toJSON(),
            total_orders: totalOrders,
            last_order_date: lastOrderDate,
          };
        }),
      );

      res.status(200).json({
        success: true,
        data: {
          suppliers: suppliersWithDetails,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error(`Get suppliers error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get supplier by ID with last 5 purchase orders
  static async getSupplierById(req, res, next) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found',
        });
      }

      // Get last 5 purchase orders
      const purchaseOrders = await PurchaseOrder.findAll({
        where: { supplier_id: id },
        attributes: ['po_id', 'po_number', 'order_date', 'status', 'total_amount', 'expected_delivery'],
        order: [['order_date', 'DESC']],
        limit: 5,
      });

      // Get total orders count
      const totalOrders = await PurchaseOrder.count({
        where: { supplier_id: id },
      });

      const supplierData = supplier.toJSON();
      supplierData.total_orders = totalOrders;
      supplierData.last_5_purchase_orders = purchaseOrders.map((po) => ({
        po_id: po.po_id,
        po_number: po.po_number,
        order_date: po.order_date,
        status: po.status,
        total_amount: po.total_amount,
        expected_delivery: po.expected_delivery,
      }));

      res.status(200).json({
        success: true,
        data: supplierData,
      });
    } catch (error) {
      logger.error(`Get supplier error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create supplier with audit log
  static async createSupplier(req, res, next) {
    try {
      const {
        name,
        contact_person,
        email,
        phone,
        address,
        payment_terms,
        lead_time,
        rating,
      } = req.body;

      // Check if supplier name already exists
      const existingSupplier = await Supplier.findOne({ where: { name } });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          error: 'Supplier with this name already exists',
        });
      }

      const supplier = await Supplier.create({
        name,
        contact_person,
        email,
        phone,
        address,
        payment_terms,
        lead_time: parseInt(lead_time) || 0,
        rating: parseFloat(rating) || 0,
        status: 'active',
      });

      // Create audit log
      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'CREATE_SUPPLIER',
        table_name: 'suppliers',
        record_id: supplier.supplier_id,
        changes: JSON.stringify({
          name,
          contact_person,
          email,
          phone,
          address,
          payment_terms,
          lead_time,
          rating,
        }),
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      logger.info(`Supplier created: ${name} by user ${req.user.user_id}`);

      res.status(201).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      logger.error(`Create supplier error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update supplier with audit log
  static async updateSupplier(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found',
        });
      }

      // If updating name, check for duplicates
      if (updateData.name && updateData.name !== supplier.name) {
        const existingSupplier = await Supplier.findOne({
          where: { name: updateData.name },
        });
        if (existingSupplier) {
          return res.status(400).json({
            success: false,
            error: 'Another supplier with this name already exists',
          });
        }
      }

      // Store old values for audit log
      const oldValues = supplier.toJSON();

      // Parse numeric fields
      if (updateData.lead_time) updateData.lead_time = parseInt(updateData.lead_time);
      if (updateData.rating) updateData.rating = parseFloat(updateData.rating);

      await supplier.update(updateData);

      // Create audit log
      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'UPDATE_SUPPLIER',
        table_name: 'suppliers',
        record_id: supplier.supplier_id,
        changes: JSON.stringify({
          before: oldValues,
          after: updateData,
        }),
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      logger.info(`Supplier updated: ${supplier.name} by user ${req.user.user_id}`);

      res.status(200).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      logger.error(`Update supplier error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Delete supplier with audit log (check for open POs)
  static async deleteSupplier(req, res, next) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found',
        });
      }

      // Check for open/pending purchase orders
      const openPOs = await PurchaseOrder.count({
        where: {
          supplier_id: id,
          status: { [Op.in]: ['draft', 'pending', 'confirmed'] },
        },
      });

      if (openPOs > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete supplier with ${openPOs} open purchase orders. Please cancel them first.`,
        });
      }

      const supplierName = supplier.name;
      await supplier.destroy();

      // Create audit log
      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'DELETE_SUPPLIER',
        table_name: 'suppliers',
        record_id: id,
        changes: JSON.stringify({
          deleted_supplier: supplierName,
        }),
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      logger.info(`Supplier deleted: ${supplierName} by user ${req.user.user_id}`);

      res.status(200).json({
        success: true,
        message: 'Supplier deleted successfully',
      });
    } catch (error) {
      logger.error(`Delete supplier error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update supplier rating
  static async updateSupplierRating(req, res, next) {
    try {
      const { id } = req.params;
      const { rating } = req.body;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5',
        });
      }

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found',
        });
      }

      const oldRating = supplier.rating;
      await supplier.update({ rating: parseFloat(rating) });

      // Create audit log
      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'UPDATE_SUPPLIER_RATING',
        table_name: 'suppliers',
        record_id: supplier.supplier_id,
        changes: JSON.stringify({
          before: { rating: oldRating },
          after: { rating },
        }),
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      logger.info(`Supplier rating updated: ${supplier.name} to ${rating} by user ${req.user.user_id}`);

      res.status(200).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      logger.error(`Update supplier rating error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
