import { Op } from 'sequelize';
import { sequelize, SalesOrder, User, Warehouse, Inventory, AuditLog } from '../models/index.js';
import logger from '../config/logger.js';

// Helpers
const uid = (req) => req.user?.user_id || req.user?.id;
const role = (req) => req.user?.role;

async function auditLog(req, action, changes, transaction) {
  try {
    await AuditLog.create({
      user_id: uid(req),
      action,
      table_name: 'sales_orders',
      changes,
      ip_address: req.ip,
    }, { transaction });
  } catch (e) {
    logger.warn(`SalesOrder audit log failed: ${e.message}`);
  }
}

async function getManagedWarehouseIds(userId, userRole) {
  if (userRole === 'admin') return null;
  const warehouses = await Warehouse.findAll({
    where: { manager_id: userId },
    attributes: ['warehouse_id'],
  });
  if (warehouses.length === 0) return [];
  return warehouses.map((w) => w.warehouse_id);
}

export class SalesController {
  static async getAll(req, res, next) {
    try {
      const userRole = role(req);
      const userId = uid(req);
      const where = {};

      if (userRole !== 'admin') {
        const warehouseIds = await getManagedWarehouseIds(userId, userRole);
        if (warehouseIds && warehouseIds.length === 0) {
          return res.json({ success: true, data: [] });
        }
        if (warehouseIds) {
          where.warehouse_id = { [Op.in]: warehouseIds };
        }
      }

      const orders = await SalesOrder.findAll({
        where,
        include: [
          { model: User, as: 'created_by_user', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'name'] }
        ],
        order: [['created_at', 'DESC']]
      });

      return res.json({ success: true, data: orders });
    } catch (error) {
      logger.error(`getAll sales orders error: ${error.message}`);
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const order = await SalesOrder.findByPk(id, {
        include: [
          { model: User, as: 'created_by_user', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'name'] }
        ]
      });

      if (!order) return res.status(404).json({ success: false, error: 'Sales order not found' });

      if (role(req) !== 'admin') {
        const warehouseIds = await getManagedWarehouseIds(uid(req), role(req));
        if (warehouseIds && !warehouseIds.includes(order.warehouse_id)) {
          return res.status(403).json({ success: false, error: 'Access denied to this warehouse data' });
        }
      }

      return res.json({ success: true, data: order });
    } catch (error) {
      logger.error(`getById sales order error: ${error.message}`);
      next(error);
    }
  }

  static async create(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { order_number, customer_name, delivery_date, warehouse_id, items, total_amount, status = 'draft' } = req.body;

      if (role(req) !== 'admin') {
        const warehouseIds = await getManagedWarehouseIds(uid(req), role(req));
        if (warehouseIds && !warehouseIds.includes(warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'You do not have access to this warehouse' });
        }
      }

      const existing = await SalesOrder.findOne({ where: { order_number } });
      if (existing) {
        await t.rollback();
        return res.status(409).json({ success: false, error: 'Order number already exists' });
      }

      const newOrder = await SalesOrder.create({
        order_number,
        customer_name,
        delivery_date,
        warehouse_id,
        items: JSON.stringify(items || []),
        total_amount,
        status,
        created_by: uid(req),
      }, { transaction: t });

      await auditLog(req, 'create', JSON.stringify({ new: newOrder.toJSON() }), t);

      await t.commit();
      return res.status(201).json({ success: true, data: newOrder });
    } catch (error) {
      await t.rollback();
      logger.error(`create sales order error: ${error.message}`);
      next(error);
    }
  }

  static async update(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const updates = req.body;
      const order = await SalesOrder.findByPk(id);

      if (!order) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }

      if (role(req) !== 'admin') {
        const warehouseIds = await getManagedWarehouseIds(uid(req), role(req));
        if (warehouseIds && !warehouseIds.includes(order.warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'Access denied to this warehouse' });
        }
      }

      if (order.status !== 'draft' && order.status !== 'pending') {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Cannot update order in current status' });
      }

      if (updates.items) {
        updates.items = JSON.stringify(updates.items);
      }

      const oldData = order.toJSON();
      await order.update(updates, { transaction: t });

      await auditLog(req, 'update', JSON.stringify({ before: oldData, after: order.toJSON() }), t);

      await t.commit();
      return res.json({ success: true, data: order });
    } catch (error) {
      await t.rollback();
      logger.error(`update sales order error: ${error.message}`);
      next(error);
    }
  }

  static async updateStatus(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await SalesOrder.findByPk(id);
      if (!order) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }

      if (role(req) !== 'admin') {
        const warehouseIds = await getManagedWarehouseIds(uid(req), role(req));
        if (warehouseIds && !warehouseIds.includes(order.warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      const oldStatus = order.status;
      if (oldStatus === status) {
        await t.rollback();
        return res.json({ success: true, data: order });
      }

      // Deduct inventory when fulfilling (dispatched or delivered)
      const fulfilling = (status === 'dispatched' || status === 'delivered') && (oldStatus === 'draft' || oldStatus === 'pending');
      
      if (fulfilling) {
        let items = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        } catch (e) {
          items = [];
        }
        for (const item of items) {
          const inv = await Inventory.findOne({
            where: { warehouse_id: order.warehouse_id, product_id: item.product_id },
            transaction: t
          });
          if (!inv || inv.quantity < item.quantity) {
            await t.rollback();
            return res.status(400).json({ 
              success: false, 
              error: `Insufficient inventory for product ID ${item.product_id}`
            });
          }
          await inv.update({ quantity: inv.quantity - item.quantity }, { transaction: t });
          
          await AuditLog.create({
            user_id: uid(req),
            action: 'update',
            table_name: 'inventory',
            changes: JSON.stringify({ reason: 'Sales Order Fulfillment', order_id: order.order_id, product_id: item.product_id, quantity_deducted: item.quantity }),
            ip_address: req.ip,
          }, { transaction: t });
        }
      }

      await order.update({ status }, { transaction: t });
      await auditLog(req, 'status_change', JSON.stringify({ oldStatus, newStatus: status }), t);

      await t.commit();
      return res.json({ success: true, data: order });
    } catch (error) {
      await t.rollback();
      logger.error(`updateStatus error: ${error.message}`);
      next(error);
    }
  }

  static async delete(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const order = await SalesOrder.findByPk(id);

      if (!order) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }

      if (role(req) !== 'admin') {
        const warehouseIds = await getManagedWarehouseIds(uid(req), role(req));
        if (warehouseIds && !warehouseIds.includes(order.warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      if (order.status !== 'draft' && order.status !== 'cancelled') {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Can only delete draft or cancelled orders' });
      }

      await order.destroy({ transaction: t });
      await auditLog(req, 'delete', JSON.stringify({ order_id: id }), t);

      await t.commit();
      return res.json({ success: true, message: 'Sales order deleted' });
    } catch (error) {
      await t.rollback();
      logger.error(`delete sales order error: ${error.message}`);
      next(error);
    }
  }
}

export default SalesController;
