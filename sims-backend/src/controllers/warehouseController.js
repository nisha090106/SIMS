import { Op } from 'sequelize';
import { Warehouse, User, Inventory, Product, AuditLog, PurchaseOrder, sequelize } from '../models/index.js';
import logger from '../config/logger.js';

/* ── helpers ─────────────────────────────────────────────────── */
const uid  = (req) => req.user?.user_id || req.user?.id;
const role = (req) => req.user?.role;

async function auditLog(req, action, changes) {
  try {
    await AuditLog.create({
      user_id:    uid(req),
      action,
      table_name: 'warehouses',
      changes,
      ip_address: req.ip,
    });
  } catch (e) {
    logger.warn(`Warehouse audit log failed: ${e.message}`);
  }
}

function managerName(u) {
  if (!u) return 'Unassigned';
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/warehouses
   Admin → all; Manager/Staff → only their managed warehouses
═══════════════════════════════════════════════════════════════ */
export async function getAllWarehouses(req, res, next) {
  try {
    const where = {};
    if (role(req) !== 'admin') {
      where.manager_id = uid(req);
    }

    const warehouses = await Warehouse.findAll({
      where,
      include: [{ model: User, as: 'manager', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['created_at', 'DESC']],
    });

    const data = warehouses.map((w) => formatWarehouse(w));
    return res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error(`getAllWarehouses: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/warehouses/:id
   Enforces access: non-admin can only see their own warehouse
═══════════════════════════════════════════════════════════════ */
export async function getWarehouseById(req, res, next) {
  try {
    const { id } = req.params;

    const warehouse = await Warehouse.findByPk(id, {
      include: [{ model: User, as: 'manager', attributes: ['id', 'first_name', 'last_name', 'email'] }],
    });

    if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });

    // Access guard
    if (role(req) !== 'admin' && warehouse.manager_id !== uid(req)) {
      return res.status(403).json({ success: false, error: 'You do not have access to this warehouse' });
    }

    // Top inventory items
    const topInventory = await Inventory.findAll({
      where: { warehouse_id: id },
      include: [{ model: Product, as: 'product', attributes: ['product_id', 'sku', 'name', 'category', 'unit_price'] }],
      order: [['quantity', 'DESC']],
      limit: 10,
    });

    const data = formatWarehouse(warehouse);
    data.top_products = topInventory.map((inv) => ({
      inventory_id: inv.id,
      product_id:   inv.product_id,
      name:         inv.product?.name,
      sku:          inv.product?.sku,
      category:     inv.product?.category,
      quantity:     inv.quantity,
      location:     inv.location,
      unit_price:   parseFloat(inv.product?.unit_price || 0),
    }));

    return res.json({ success: true, data });
  } catch (err) {
    logger.error(`getWarehouseById: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/warehouses/:id/stats
═══════════════════════════════════════════════════════════════ */
export async function getWarehouseStats(req, res, next) {
  try {
    const { id } = req.params;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });

    if (role(req) !== 'admin' && warehouse.manager_id !== uid(req)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const [stockStats] = await sequelize.query(
      `SELECT
         COUNT(DISTINCT i.product_id) AS unique_products,
         COALESCE(SUM(i.quantity), 0)               AS total_qty,
         COALESCE(SUM(i.quantity * p.unit_price), 0) AS stock_value,
         SUM(CASE WHEN i.quantity = 0 THEN 1 ELSE 0 END)                          AS out_of_stock,
         SUM(CASE WHEN i.quantity > 0 AND i.quantity <= p.reorder_level THEN 1 ELSE 0 END) AS low_stock
       FROM inventory i
       JOIN products p ON i.product_id = p.product_id
       WHERE i.warehouse_id = :wid`,
      { replacements: { wid: id }, type: sequelize.QueryTypes.SELECT },
    );

    const activePOs = await PurchaseOrder.count({
      where: { status: { [Op.in]: ['pending', 'confirmed'] } },
    });

    const recentActivity = await AuditLog.findAll({
      where: { table_name: 'inventory' },
      order: [['timestamp', 'DESC']],
      limit: 10,
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }],
    });

    const usagePct = (Number(warehouse.current_usage) / Number(warehouse.capacity)) * 100;

    return res.json({
      success: true,
      data: {
        warehouse_id:   warehouse.warehouse_id,
        name:           warehouse.name,
        capacity:       Number(warehouse.capacity),
        current_usage:  Number(warehouse.current_usage),
        usage_percent:  Math.min(100, usagePct).toFixed(1),
        status:         warehouse.status,
        uniqueProducts: Number(stockStats?.unique_products || 0),
        totalQty:       Number(stockStats?.total_qty       || 0),
        stockValue:     Number(stockStats?.stock_value     || 0),
        outOfStock:     Number(stockStats?.out_of_stock    || 0),
        lowStock:       Number(stockStats?.low_stock       || 0),
        activePOs,
        recentActivity: recentActivity.map((log) => ({
          action:    log.action,
          user:      `${log.user?.first_name || ''} ${log.user?.last_name || ''}`.trim() || 'System',
          timestamp: log.timestamp,
          changes:   log.changes,
        })),
      },
    });
  } catch (err) {
    logger.error(`getWarehouseStats: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/warehouses/:id/inventory
   Paginated stock list for a specific warehouse
═══════════════════════════════════════════════════════════════ */
export async function getWarehouseInventory(req, res, next) {
  try {
    const { id } = req.params;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });

    if (role(req) !== 'admin' && warehouse.manager_id !== uid(req)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { count, rows } = await Inventory.findAndCountAll({
      where: { warehouse_id: id },
      include: [{ model: Product, as: 'product', attributes: ['product_id', 'sku', 'name', 'category', 'unit_price', 'reorder_level', 'unit', 'image_url'] }],
      limit,
      offset: (page - 1) * limit,
      order: [['quantity', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        inventory:  rows.map((r) => formatInvRow(r)),
        total:      count,
        page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    logger.error(`getWarehouseInventory: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/warehouses  (Admin only)
═══════════════════════════════════════════════════════════════ */
export async function createWarehouse(req, res, next) {
  try {
    const { name, code, location, city, country, address, capacity, manager_id, status = 'active' } = req.body;

    const existing = await Warehouse.findOne({ where: { name } });
    if (existing) return res.status(409).json({ success: false, error: 'Warehouse name already exists' });

    const warehouse = await Warehouse.create({
      name,
      code: code ? code.toUpperCase() : null,
      location, city, country, address,
      capacity, manager_id, status,
      current_usage: 0,
    });

    await auditLog(req, 'create', { new: warehouse.toJSON() });
    logger.info(`Warehouse created: ${name}`);

    return res.status(201).json({ success: true, data: warehouse });
  } catch (err) {
    logger.error(`createWarehouse: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   PUT /api/warehouses/:id  (Admin only)
═══════════════════════════════════════════════════════════════ */
export async function updateWarehouse(req, res, next) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.code) updates.code = updates.code.toUpperCase();

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });

    const old = warehouse.toJSON();
    await warehouse.update(updates);

    await auditLog(req, 'update', { before: old, after: updates });
    return res.json({ success: true, data: warehouse });
  } catch (err) {
    logger.error(`updateWarehouse: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   DELETE /api/warehouses/:id  (Admin only — soft delete via status)
═══════════════════════════════════════════════════════════════ */
export async function deleteWarehouse(req, res, next) {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });

    const stockCount = await Inventory.count({ where: { warehouse_id: id, quantity: { [Op.gt]: 0 } } });
    if (stockCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Warehouse has ${stockCount} stocked item(s). Transfer all stock before deleting.`,
      });
    }

    await warehouse.update({ status: 'inactive' });
    await auditLog(req, 'delete', { warehouse_id: id, name: warehouse.name });

    return res.json({ success: true, message: 'Warehouse deactivated successfully' });
  } catch (err) {
    logger.error(`deleteWarehouse: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/warehouses/managers
═══════════════════════════════════════════════════════════════ */
export async function getManagers(req, res, next) {
  try {
    const managers = await User.findAll({
      where: { role: { [Op.in]: ['admin', 'manager'] }, status: 'active' },
      attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
      order: [['first_name', 'ASC']],
    });

    return res.json({
      success: true,
      data: managers.map((u) => ({
        user_id:   u.id,
        id:        u.id,
        full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        email:     u.email,
        role:      u.role,
      })),
    });
  } catch (err) {
    logger.error(`getManagers: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/warehouses/:id/capacity  (backward compat)
═══════════════════════════════════════════════════════════════ */
export async function getCapacityUsage(req, res, next) {
  return getWarehouseStats(req, res, next);
}

/* ── formatters ─────────────────────────────────────────────── */
function formatWarehouse(w) {
  const json = w.toJSON ? w.toJSON() : w;
  const pct  = json.capacity > 0
    ? (Number(json.current_usage) / Number(json.capacity)) * 100
    : 0;
  return {
    ...json,
    manager_name:        managerName(json.manager),
    utilization_percent: Math.min(100, pct),
  };
}

function formatInvRow(inv) {
  const i = inv.toJSON ? inv.toJSON() : inv;
  const p = i.product || {};
  const qty = i.quantity;
  const rl  = p.reorder_level ?? 10;
  return {
    id:           i.id,
    product_id:   i.product_id,
    product_name: p.name,
    sku:          p.sku,
    category:     p.category,
    unit:         p.unit,
    unit_price:   parseFloat(p.unit_price || 0),
    quantity:     qty,
    reserved_qty: i.reserved_qty ?? 0,
    available_qty: Math.max(0, qty - (i.reserved_qty ?? 0)),
    reorder_level: rl,
    batch_no:     i.batch_no,
    expiry_date:  i.expiry_date,
    location:     i.location,
    updated_at:   i.updated_at,
    stockStatus:  qty === 0 ? 'out_of_stock' : qty <= rl ? 'low_stock' : 'in_stock',
    stockValue:   qty * parseFloat(p.unit_price || 0),
  };
}
