import { Op } from 'sequelize';
import {
  sequelize, SalesOrder, SalesOrder as SO,
  User, Warehouse, Inventory, Product, AuditLog,
} from '../models/index.js';
import logger from '../config/logger.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const uid  = (req) => req.user?.id || req.user?.user_id;
const role = (req) => req.user?.role;

/** Returns managed warehouse IDs for non-admin users, or null for admin. */
async function getManagedWarehouseIds(userId, userRole) {
  if (userRole === 'admin') return null;
  const rows = await Warehouse.findAll({
    where: { manager_id: userId },
    attributes: ['warehouse_id'],
  });
  return rows.map((w) => w.warehouse_id);   // [] means "no access"
}

/** Parse items JSON safely — always returns an array. */
function parseItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

/** Generate order number: SO-YYYYMMDD-XXXX */
function genOrderNumber() {
  const d = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SO-${d}-${r}`;
}

/** Write an audit log entry, never throws. */
async function audit(req, action, changes, t) {
  try {
    await AuditLog.create(
      { user_id: uid(req), action, table_name: 'sales_orders', changes, ip_address: req.ip },
      t ? { transaction: t } : {},
    );
  } catch (e) {
    logger.warn(`SalesOrder audit log failed: ${e.message}`);
  }
}

/** Standard include list for detail responses. */
const SO_INCLUDE = [
  { model: User,      as: 'created_by_user', attributes: ['id', 'first_name', 'last_name', 'email'] },
  { model: Warehouse, as: 'warehouse',        attributes: ['warehouse_id', 'name', 'location'] },
];

/** Format an order row — parse items JSON and attach it to the response. */
function format(order) {
  const json  = order.toJSON ? order.toJSON() : order;
  json.items  = parseItems(json.items);
  return json;
}

// ─── Controller ─────────────────────────────────────────────────────────────

export class SalesController {

  /* ═══════════════════════════════════════════════════════════
     GET /api/sales-orders
     Query params: page, limit, status, search, warehouseId,
                   from (date), to (date)
  ═══════════════════════════════════════════════════════════ */
  static async getAll(req, res, next) {
    try {
      const userRole = role(req);
      const userId   = uid(req);

      // Pagination
      const page   = Math.max(1, parseInt(req.query.page)  || 1);
      const limit  = Math.min(100, parseInt(req.query.limit) || 20);
      const offset = (page - 1) * limit;

      // Filters
      const { status, search, warehouseId, from, to } = req.query;
      const where = {};

      if (status && status !== 'all') where.status = status;
      if (search)  where[Op.or] = [
        { order_number:  { [Op.iLike]: `%${search}%` } },
        { customer_name: { [Op.iLike]: `%${search}%` } },
      ];
      if (from || to) {
        where.order_date = {};
        if (from) where.order_date[Op.gte] = new Date(from);
        if (to)   where.order_date[Op.lte] = new Date(to);
      }

      // Warehouse isolation
      if (userRole !== 'admin') {
        const ids = await getManagedWarehouseIds(userId, userRole);
        if (ids.length === 0) {
          return res.json({ success: true, data: { orders: [], total: 0, page, totalPages: 0 } });
        }
        where.warehouse_id = { [Op.in]: ids };
      } else if (warehouseId) {
        where.warehouse_id = parseInt(warehouseId);
      }

      const { count, rows } = await SalesOrder.findAndCountAll({
        where,
        include: SO_INCLUDE,
        order:  [['created_at', 'DESC']],
        limit, offset, distinct: true,
      });

      return res.json({
        success: true,
        data: {
          orders:     rows.map(format),
          total:      count,
          page,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (err) {
      logger.error(`getAll sales orders: ${err.message}`);
      next(err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     GET /api/sales-orders/:id
  ═══════════════════════════════════════════════════════════ */
  static async getById(req, res, next) {
    try {
      const order = await SalesOrder.findByPk(req.params.id, { include: SO_INCLUDE });
      if (!order) return res.status(404).json({ success: false, error: 'Sales order not found' });

      if (role(req) !== 'admin') {
        const ids = await getManagedWarehouseIds(uid(req), role(req));
        if (!ids.includes(order.warehouse_id)) {
          return res.status(403).json({ success: false, error: 'Access denied to this warehouse' });
        }
      }

      return res.json({ success: true, data: format(order) });
    } catch (err) {
      logger.error(`getById sales order: ${err.message}`);
      next(err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     POST /api/sales-orders
     Body: { customer_name, warehouse_id, delivery_date?,
             items: [{ product_id, quantity, unit_price }],
             notes? }
     - Auto-generates order_number
     - Validates each product exists
     - Computes total_amount from items
     - Starts in 'draft' status (no stock deducted yet)
  ═══════════════════════════════════════════════════════════ */
  static async create(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { customer_name, warehouse_id, delivery_date, items, notes } = req.body;

      // ── Validation ──
      if (!customer_name?.trim()) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'customer_name is required' });
      }
      if (!warehouse_id) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'warehouse_id is required' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'At least one item is required' });
      }

      // ── Warehouse access ──
      const warehouse = await Warehouse.findByPk(warehouse_id);
      if (!warehouse) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Warehouse not found' });
      }
      if (role(req) !== 'admin') {
        const ids = await getManagedWarehouseIds(uid(req), role(req));
        if (!ids.includes(Number(warehouse_id))) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'You do not have access to this warehouse' });
        }
      }

      // ── Build line items & compute total ──
      let total_amount = 0;
      const lineItems = [];
      for (const item of items) {
        if (!item.product_id || !item.quantity || Number(item.quantity) <= 0) {
          await t.rollback();
          return res.status(400).json({ success: false, error: 'Each item requires product_id and a positive quantity' });
        }
        const product = await Product.unscoped().findByPk(item.product_id, { transaction: t });
        if (!product) {
          await t.rollback();
          return res.status(404).json({ success: false, error: `Product ID ${item.product_id} not found` });
        }
        const qty        = Number(item.quantity);
        const unit_price = Number(item.unit_price || product.unit_price || 0);
        total_amount    += qty * unit_price;
        lineItems.push({
          product_id:   product.product_id,
          product_name: product.name,
          sku:          product.sku,
          quantity:     qty,
          unit_price,
          total_price:  qty * unit_price,
        });
      }

      // ── Unique order number ──
      let order_number;
      let attempts = 0;
      do {
        order_number = genOrderNumber();
        const clash = await SalesOrder.findOne({ where: { order_number }, transaction: t });
        if (!clash) break;
      } while (++attempts < 5);

      // ── Persist ──
      const order = await SalesOrder.create({
        order_number,
        customer_name: customer_name.trim(),
        warehouse_id:  Number(warehouse_id),
        delivery_date: delivery_date || null,
        order_date:    new Date(),
        status:        'draft',
        total_amount,
        items:         JSON.stringify(lineItems),
        notes:         notes || null,
        created_by:    uid(req),
      }, { transaction: t });

      await audit(req, 'create', { order_number, customer_name, total_amount, item_count: lineItems.length }, t);
      await t.commit();

      const full = await SalesOrder.findByPk(order.order_id, { include: SO_INCLUDE });
      return res.status(201).json({ success: true, data: format(full) });
    } catch (err) {
      await t.rollback();
      logger.error(`create sales order: ${err.message}`);
      next(err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     PUT /api/sales-orders/:id
     Only allowed on draft or pending orders.
  ═══════════════════════════════════════════════════════════ */
  static async update(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const order = await SalesOrder.findByPk(req.params.id, { transaction: t });
      if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Sales order not found' }); }

      if (!['draft', 'pending'].includes(order.status)) {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Cannot edit an order with status "${order.status}"` });
      }
      if (role(req) !== 'admin') {
        const ids = await getManagedWarehouseIds(uid(req), role(req));
        if (!ids.includes(order.warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'Access denied to this warehouse' });
        }
      }

      const { customer_name, delivery_date, items, notes } = req.body;
      const before = order.toJSON();

      if (customer_name) order.customer_name = customer_name.trim();
      if (delivery_date !== undefined) order.delivery_date = delivery_date || null;
      if (notes !== undefined) order.notes = notes || null;

      if (Array.isArray(items) && items.length > 0) {
        let total = 0;
        const lineItems = [];
        for (const item of items) {
          const product = await Product.unscoped().findByPk(item.product_id, { transaction: t });
          if (!product) { await t.rollback(); return res.status(404).json({ success: false, error: `Product ID ${item.product_id} not found` }); }
          const qty = Number(item.quantity);
          const unit_price = Number(item.unit_price || product.unit_price || 0);
          total += qty * unit_price;
          lineItems.push({ product_id: product.product_id, product_name: product.name, sku: product.sku, quantity: qty, unit_price, total_price: qty * unit_price });
        }
        order.items        = JSON.stringify(lineItems);
        order.total_amount = total;
      }

      await order.save({ transaction: t });
      await audit(req, 'update', { before, after: order.toJSON() }, t);
      await t.commit();

      const full = await SalesOrder.findByPk(order.order_id, { include: SO_INCLUDE });
      return res.json({ success: true, data: format(full) });
    } catch (err) {
      await t.rollback();
      logger.error(`update sales order: ${err.message}`);
      next(err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     POST /api/sales-orders/:id/fulfill
     Transitions:  draft | pending  →  dispatched
     - Validates stock for every line item BEFORE deducting any
     - Deducts inventory inside a single transaction
     - Writes one audit log per inventory change
  ═══════════════════════════════════════════════════════════ */
  static async fulfill(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const order = await SalesOrder.findByPk(req.params.id, { transaction: t });
      if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Sales order not found' }); }

      if (!['draft', 'pending'].includes(order.status)) {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Order cannot be fulfilled from status "${order.status}"` });
      }
      if (role(req) !== 'admin') {
        const ids = await getManagedWarehouseIds(uid(req), role(req));
        if (!ids.includes(order.warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'Access denied to this warehouse' });
        }
      }

      const items = parseItems(order.items);
      if (items.length === 0) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Order has no items to fulfill' });
      }

      // ── Pre-flight stock check (all items, before touching anything) ──
      for (const item of items) {
        const inv = await Inventory.findOne({
          where: { warehouse_id: order.warehouse_id, product_id: item.product_id },
          transaction: t,
        });
        const available = inv ? (inv.quantity - (inv.reserved_qty || 0)) : 0;
        if (!inv || available < item.quantity) {
          await t.rollback();
          // Fetch product name for a helpful error message
          const prod = await Product.unscoped().findByPk(item.product_id);
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for "${prod?.name || item.product_id}". Available: ${available}, Required: ${item.quantity}`,
            detail: { product_id: item.product_id, available, required: item.quantity },
          });
        }
      }

      // ── Deduct inventory ──
      for (const item of items) {
        const inv = await Inventory.findOne({
          where: { warehouse_id: order.warehouse_id, product_id: item.product_id },
          transaction: t,
        });
        await inv.update({ quantity: inv.quantity - item.quantity }, { transaction: t });

        await AuditLog.create({
          user_id:    uid(req),
          action:     'update',
          table_name: 'inventory',
          changes: {
            reason:            'Sales Order Dispatch',
            order_id:          order.order_id,
            order_number:      order.order_number,
            product_id:        item.product_id,
            quantity_deducted: item.quantity,
            stock_before:      inv.quantity,
            stock_after:       inv.quantity - item.quantity,
          },
          ip_address: req.ip,
        }, { transaction: t });
      }

      // ── Update order status ──
      await order.update({ status: 'dispatched' }, { transaction: t });
      await audit(req, 'update', { order_number: order.order_number, status: { from: order.status, to: 'dispatched' } }, t);
      await t.commit();

      logger.info(`Sales order ${order.order_number} dispatched`);
      const full = await SalesOrder.findByPk(order.order_id, { include: SO_INCLUDE });
      return res.json({ success: true, data: format(full) });
    } catch (err) {
      await t.rollback();
      logger.error(`fulfill sales order: ${err.message}`);
      next(err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     POST /api/sales-orders/:id/deliver
     Transitions: dispatched → delivered
  ═══════════════════════════════════════════════════════════ */
  static async deliver(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const order = await SalesOrder.findByPk(req.params.id, { transaction: t });
      if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Sales order not found' }); }

      if (order.status !== 'dispatched') {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Only dispatched orders can be marked delivered. Current: "${order.status}"` });
      }
      if (role(req) !== 'admin') {
        const ids = await getManagedWarehouseIds(uid(req), role(req));
        if (!ids.includes(order.warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      await order.update({ status: 'delivered' }, { transaction: t });
      await audit(req, 'update', { order_number: order.order_number, status: { from: 'dispatched', to: 'delivered' } }, t);
      await t.commit();

      const full = await SalesOrder.findByPk(order.order_id, { include: SO_INCLUDE });
      return res.json({ success: true, data: format(full) });
    } catch (err) {
      await t.rollback();
      logger.error(`deliver sales order: ${err.message}`);
      next(err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     POST /api/sales-orders/:id/cancel
     Allowed from: draft | pending
     Admin can also cancel dispatched orders (with stock restore).
     Body: { reason? }
  ═══════════════════════════════════════════════════════════ */
  static async cancel(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const order = await SalesOrder.findByPk(req.params.id, { transaction: t });
      if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Sales order not found' }); }

      const cancelableStatuses = role(req) === 'admin'
        ? ['draft', 'pending', 'dispatched']
        : ['draft', 'pending'];

      if (!cancelableStatuses.includes(order.status)) {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Cannot cancel an order with status "${order.status}"` });
      }
      if (role(req) !== 'admin') {
        const ids = await getManagedWarehouseIds(uid(req), role(req));
        if (!ids.includes(order.warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      // Restore stock if order was already dispatched
      if (order.status === 'dispatched') {
        const items = parseItems(order.items);
        for (const item of items) {
          const inv = await Inventory.findOne({
            where: { warehouse_id: order.warehouse_id, product_id: item.product_id },
            transaction: t,
          });
          if (inv) {
            await inv.update({ quantity: inv.quantity + item.quantity }, { transaction: t });
            await AuditLog.create({
              user_id: uid(req), action: 'update', table_name: 'inventory',
              changes: { reason: 'Sales Order Cancellation — stock restored', order_number: order.order_number, product_id: item.product_id, quantity_restored: item.quantity },
              ip_address: req.ip,
            }, { transaction: t });
          }
        }
      }

      const { reason } = req.body;
      await order.update({ status: 'cancelled' }, { transaction: t });
      await audit(req, 'update', { order_number: order.order_number, status: { from: order.status, to: 'cancelled' }, reason: reason || null }, t);
      await t.commit();

      const full = await SalesOrder.findByPk(order.order_id, { include: SO_INCLUDE });
      return res.json({ success: true, data: format(full) });
    } catch (err) {
      await t.rollback();
      logger.error(`cancel sales order: ${err.message}`);
      next(err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     DELETE /api/sales-orders/:id
     Hard-delete only allowed for draft or cancelled orders.
  ═══════════════════════════════════════════════════════════ */
  static async delete(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const order = await SalesOrder.findByPk(req.params.id, { transaction: t });
      if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Sales order not found' }); }

      if (!['draft', 'cancelled'].includes(order.status)) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Only draft or cancelled orders can be deleted' });
      }
      if (role(req) !== 'admin') {
        const ids = await getManagedWarehouseIds(uid(req), role(req));
        if (!ids.includes(order.warehouse_id)) {
          await t.rollback();
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      await order.destroy({ transaction: t });
      await audit(req, 'delete', { order_number: order.order_number, order_id: order.order_id }, t);
      await t.commit();

      return res.json({ success: true, message: `Order ${order.order_number} deleted` });
    } catch (err) {
      await t.rollback();
      logger.error(`delete sales order: ${err.message}`);
      next(err);
    }
  }
}

export default SalesController;
