import {
  sequelize,
  Request,
  RequestItem,
  Product,
  Warehouse,
  Inventory,
  User,
  AuditLog,
} from '../models/index.js';
import { Op } from 'sequelize';
import logger from '../config/logger.js';
import { getClientIP } from '../utils/helpers.js';
import NotificationService from '../services/notificationService.js';

export class RequestController {
  /**
   * Generate unique request number: REQ-YYYYMMDD-XXXX
   */
  static generateRequestNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REQ-${dateStr}-${randomNum}`;
  }

  /**
   * POST /api/requests
   * Create a new request
   */
  static async createRequest(req, res, next) {
    try {
      const { warehouse_id, priority, notes, items } = req.body;

      if (!warehouse_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Warehouse ID and at least one item are required',
        });
      }

      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid priority level',
        });
      }

      // Verify warehouse exists
      const warehouse = await Warehouse.findByPk(warehouse_id);
      if (!warehouse) {
        return res.status(404).json({ success: false, error: 'Warehouse not found' });
      }

      // Verify all products exist
      const productIds = items.map(item => item.product_id);
      const products = await Product.findAll({ where: { product_id: { [Op.in]: productIds } } });
      if (products.length !== productIds.length) {
        return res.status(400).json({ success: false, error: 'One or more products not found' });
      }

      // Validate quantities
      for (const item of items) {
        if (!item.product_id || !item.requested_qty || item.requested_qty <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have product_id and positive requested_qty',
          });
        }
      }

      const t = await sequelize.transaction();
      try {
        // Create request
        const requestNumber = this.generateRequestNumber();
        const newRequest = await Request.create({
          request_number: requestNumber,
          requester_id: req.user.user_id,
          warehouse_id,
          priority: priority || 'medium',
          notes: notes || null,
          status: 'pending',
        }, { transaction: t });

        // Create request items
        const requestItems = await RequestItem.bulkCreate(
          items.map(item => ({
            request_id: newRequest.id,
            product_id: item.product_id,
            requested_qty: item.requested_qty,
            notes: item.notes || null,
          })),
          { transaction: t },
        );

        // Log to audit
        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'create',
          table_name: 'requests',
          changes: {
            request_number: requestNumber,
            item_count: items.length,
            warehouse_id,
            priority,
          },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Request ${requestNumber} created by user ${req.user.user_id}`);

        // Fire notification to managers/admins (non-blocking)
        NotificationService.onRequestCreated({
          id: newRequest.id,
          request_number: requestNumber,
          requester_id: req.user.user_id,
          priority: priority || 'medium',
        }).catch(() => {});

        return res.status(201).json({
          success: true,
          message: 'Request created successfully',
          data: {
            id: newRequest.id,
            request_number: newRequest.request_number,
            status: newRequest.status,
            priority: newRequest.priority,
            item_count: items.length,
          },
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Create request error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/requests
   * Get all requests (with role-based filtering)
   */
  static async getAllRequests(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;
      const { status, priority, warehouse_id } = req.query;

      const where = {};

      // Role-based filtering
      if (req.user.role === 'requester' || req.user.role === 'user') {
        // Requester only sees own requests
        where.requester_id = req.user.user_id;
      } else if (req.user.role === 'manager') {
        // Manager sees requests for their warehouse
        where.warehouse_id = req.user.warehouse_id;
      }
      // Admin sees all requests

      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (warehouse_id && req.user.role === 'admin') {
        where.warehouse_id = parseInt(warehouse_id, 10);
      }

      const { count: total, rows: requests } = await Request.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            association: 'requester',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
          {
            association: 'warehouse',
            attributes: ['warehouse_id', 'name'],
          },
          {
            association: 'items',
            include: [
              {
                association: 'product',
                attributes: ['product_id', 'sku', 'name'],
              },
            ],
          },
        ],
      });

      return res.status(200).json({
        success: true,
        data: {
          requests,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error(`Get requests error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/requests/:id
   * Get single request with full details
   */
  static async getRequestById(req, res, next) {
    try {
      const { id } = req.params;

      const request = await Request.findByPk(id, {
        include: [
          {
            association: 'requester',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
          {
            association: 'warehouse',
            attributes: ['warehouse_id', 'name'],
          },
          {
            association: 'approver',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
          {
            association: 'fulfiller',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
          {
            association: 'items',
            include: [
              {
                association: 'product',
                attributes: ['product_id', 'sku', 'name', 'image_url'],
              },
            ],
          },
        ],
      });

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      // Check authorization
      if (req.user.role === 'requester' && request.requester_id !== req.user.user_id) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }
      if (req.user.role === 'manager' && request.warehouse_id !== req.user.warehouse_id) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      return res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error) {
      logger.error(`Get request error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/requests/:id/approve
   * Approve request (with optional partial qty approval)
   */
  static async approveRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { approved_items } = req.body;

      const request = await Request.findByPk(id, {
        include: [{ association: 'items' }],
      });

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Cannot approve a ${request.status} request`,
        });
      }

      const t = await sequelize.transaction();
      try {
        // Update request status
        await request.update({
          status: 'approved',
          approved_by: req.user.user_id,
          approved_at: new Date(),
        }, { transaction: t });

        // Update approved quantities for items
        if (approved_items && Array.isArray(approved_items)) {
          for (const approvedItem of approved_items) {
            const item = request.items.find(i => i.id === approvedItem.id);
            if (item) {
              const approvedQty = approvedItem.approved_qty || item.requested_qty;
              if (approvedQty > item.requested_qty) {
                await t.rollback();
                return res.status(400).json({
                  success: false,
                  error: `Approved qty cannot exceed requested qty for item ${approvedItem.id}`,
                });
              }
              await item.update({ approved_qty: approvedQty }, { transaction: t });
            }
          }
        } else {
          // Approve all items with requested quantities
          for (const item of request.items) {
            await item.update({ approved_qty: item.requested_qty }, { transaction: t });
          }
        }

        // Log to audit
        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'update',
          table_name: 'requests',
          changes: {
            status: 'approved',
            approved_by: req.user.user_id,
            request_id: id,
          },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Request ${request.request_number} approved by user ${req.user.user_id}`);

        // Notify the requester (non-blocking)
        NotificationService.onRequestApproved(request, req.user.user_id).catch(() => {});

        return res.status(200).json({
          success: true,
          message: 'Request approved successfully',
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Approve request error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/requests/:id/reject
   * Reject request with reason
   */
  static async rejectRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;

      if (!rejection_reason || rejection_reason.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      const request = await Request.findByPk(id);

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      if (request.status !== 'pending' && request.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: `Cannot reject a ${request.status} request`,
        });
      }

      const t = await sequelize.transaction();
      try {
        await request.update({
          status: 'rejected',
          rejection_reason,
          rejected_at: new Date(),
          approved_by: req.user.user_id,
        }, { transaction: t });

        // Log to audit
        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'update',
          table_name: 'requests',
          changes: {
            status: 'rejected',
            rejection_reason,
            request_id: id,
          },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Request ${request.request_number} rejected by user ${req.user.user_id}`);

        // Notify the requester (non-blocking)
        NotificationService.onRequestRejected(request, req.user.user_id, rejection_reason).catch(() => {});

        return res.status(200).json({
          success: true,
          message: 'Request rejected successfully',
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Reject request error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/requests/:id/fulfill
   * Fulfill request - deduct inventory
   */
  static async fulfillRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { fulfill_items } = req.body;

      const request = await Request.findByPk(id, {
        include: [{ association: 'items' }],
      });

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      if (request.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Only approved requests can be fulfilled',
        });
      }

      const t = await sequelize.transaction();
      try {
        let allFulfilled = true;

        // Process each item
        for (const item of request.items) {
          const fulfillQty = fulfill_items?.find(f => f.id === item.id)?.fulfilled_qty || item.approved_qty;

          if (fulfillQty === null || fulfillQty === undefined) {
            allFulfilled = false;
            continue;
          }

          if (fulfillQty > (item.approved_qty || item.requested_qty)) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              error: `Fulfilled quantity cannot exceed approved quantity for item ${item.id}`,
            });
          }

          // Check inventory
          const inventory = await Inventory.findOne({
            where: {
              product_id: item.product_id,
              warehouse_id: request.warehouse_id,
            },
            transaction: t,
          });

          if (!inventory || inventory.quantity < fulfillQty) {
            await t.rollback();
            const product = await Product.findByPk(item.product_id);
            return res.status(400).json({
              success: false,
              error: `Insufficient inventory for ${product.sku}. Available: ${inventory?.quantity || 0}, Requested: ${fulfillQty}`,
            });
          }

          // Deduct inventory
          await inventory.update(
            { quantity: inventory.quantity - fulfillQty },
            { transaction: t },
          );

          // Update fulfilled quantity
          await item.update(
            { fulfilled_qty: fulfillQty },
            { transaction: t },
          );
        }

        // Update request status
        const newStatus = allFulfilled ? 'fulfilled' : 'approved';
        await request.update({
          status: newStatus,
          fulfilled_by: req.user.user_id,
          fulfilled_at: newStatus === 'fulfilled' ? new Date() : null,
        }, { transaction: t });

        // Log to audit
        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'update',
          table_name: 'requests',
          changes: {
            status: newStatus,
            fulfilled_items_count: request.items.length,
            request_id: id,
          },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Request ${request.request_number} fulfilled by user ${req.user.user_id}`);

        // Notify the requester if fully fulfilled (non-blocking)
        if (newStatus === 'fulfilled') {
          NotificationService.onRequestFulfilled(request, req.user.user_id).catch(() => {});
        }

        return res.status(200).json({
          success: true,
          message: 'Request fulfilled successfully',
          status: newStatus,
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Fulfill request error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/requests/:id/cancel
   * Cancel request (requester can only cancel pending requests)
   */
  static async cancelRequest(req, res, next) {
    try {
      const { id } = req.params;

      const request = await Request.findByPk(id);

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      // Only requester can cancel their own pending requests
      if (req.user.role === 'requester' || req.user.role === 'user') {
        if (request.requester_id !== req.user.user_id) {
          return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel a ${request.status} request`,
        });
      }

      const t = await sequelize.transaction();
      try {
        await request.update({
          status: 'cancelled',
        }, { transaction: t });

        // Log to audit
        await AuditLog.create({
          user_id: req.user.user_id,
          action: 'update',
          table_name: 'requests',
          changes: {
            status: 'cancelled',
            cancelled_by_user: req.user.user_id,
            request_id: id,
          },
          ip_address: getClientIP(req),
        }, { transaction: t });

        await t.commit();

        logger.info(`Request ${request.request_number} cancelled by user ${req.user.user_id}`);

        // Notify managers/admins (non-blocking)
        NotificationService.onRequestCancelled(request).catch(() => {});

        return res.status(200).json({
          success: true,
          message: 'Request cancelled successfully',
        });
      } catch (innerErr) {
        await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      logger.error(`Cancel request error: ${error.message}`);
      next(error);
    }
  }
}

export default RequestController;
