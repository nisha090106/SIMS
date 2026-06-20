import { Op } from 'sequelize';
import { Inventory, Product, Warehouse, AuditLog, sequelize } from '../models/index.js';
import logger from '../config/logger.js';

/* ── helpers ─────────────────────────────────────────────────── */
const uid  = (req) => req.user?.user_id || req.user?.id;
const role = (req) => req.user?.role;

/**
 * Returns { warehouse_ids: [...] | null }
 * null  = no filter (admin sees everything)
 * [...] = list of warehouse IDs the user manages
 */
async function getWarehouseScope(req) {
  if (role(req) === 'admin') return null;
  const whs = await Warehouse.findAll({
    where: { manager_id: uid(req) },
    attributes: ['warehouse_id'],
  });
  return whs.length ? whs.map((w) => w.warehouse_id) : [];
}

function buildWhereFromScope(scope) {
  if (scope === null) return {};
  if (scope.length === 0) return { warehouse_id: -1 }; // no access
  return { warehouse_id: { [Op.in]: scope } };
}

function computeStockStatus(qty, reorderLevel) {
  if (qty === 0)             return 'out_of_stock';
  if (qty <= reorderLevel)   return 'low_stock';
  return 'in_stock';
}

async function auditLog(req, action, changes) {
  try {
    await AuditLog.create({
      user_id:    uid(req),
      action,
      table_name: 'inventory',
      changes,
      ip_address: req.ip,
    });
  } catch (e) {
    logger.warn(`Audit log failed: ${e.message}`);
  }
}

/* ── shared include for product + warehouse ─────────────────── */
const fullInclude = [
  {
    model: Product,
    as: 'product',
    attributes: ['product_id', 'sku', 'name', 'category', 'unit_price', 'reorder_level', 'unit', 'image_url'],
  },
  {
    model: Warehouse,
    as: 'warehouse',
    attributes: ['warehouse_id', 'name', 'location', 'city'],
  },
];

/* ═══════════════════════════════════════════════════════════════
   GET /api/inventory
═══════════════════════════════════════════════════════════════ */
export async function getInventory(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const {
      search, warehouseId, warehouse_id,
      category, lowStock, outOfStock, expiringSoon,
    } = req.query;

    const whId = warehouseId || warehouse_id;

    // Warehouse scope
    const scope = await getWarehouseScope(req);
    const whereBase = buildWhereFromScope(scope);

    // Override: if admin passes explicit warehouse filter, honour it
    if (whId) whereBase.warehouse_id = whId;

    // Stock status filters
    if (outOfStock === 'true') {
      whereBase.quantity = 0;
    } else if (lowStock === 'true') {
      whereBase.quantity = { [Op.gt]: 0 };
    }

    // Expiring soon (within 30 days)
    if (expiringSoon === 'true') {
      const now   = new Date();
      const in30  = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      whereBase.expiry_date = { [Op.between]: [now, in30] };
    }

    const productWhere = {};
    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku:  { [Op.like]: `%${search}%` } },
      ];
    }
    if (category) productWhere.category = category;

    const { count, rows } = await Inventory.findAndCountAll({
      where: whereBase,
      limit,
      offset,
      distinct: true,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['product_id', 'sku', 'name', 'category', 'unit_price', 'reorder_level', 'unit', 'image_url'],
          where: Object.keys(productWhere).length ? productWhere : undefined,
          required: Object.keys(productWhere).length > 0,
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'name', 'location', 'city'],
        },
      ],
      order: [['updated_at', 'DESC']],
    });

    const data = rows.map((inv) => formatRow(inv));

    // Apply lowStock JS filter (when not using DB-level qty=0 shortcut)
    const filtered = lowStock === 'true' && outOfStock !== 'true'
      ? data.filter((r) => r.stockStatus === 'low_stock')
      : data;

    return res.json({
      success: true,
      data: {
        inventory:  filtered,
        total:      count,
        page,
        totalPages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (err) {
    logger.error(`getInventory: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/inventory/:id
═══════════════════════════════════════════════════════════════ */
export async function getInventoryById(req, res, next) {
  try {
    const { id } = req.params;
    const scope  = await getWarehouseScope(req);
    const whWhere = buildWhereFromScope(scope);

    const inv = await Inventory.findOne({
      where: { id, ...whWhere },
      include: fullInclude,
    });
    if (!inv) return res.status(404).json({ success: false, error: 'Inventory record not found' });
    return res.json({ success: true, data: formatRow(inv) });
  } catch (err) { next(err); }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/inventory/stock-in
═══════════════════════════════════════════════════════════════ */
export async function stockIn(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const {
      product_id, warehouse_id, quantity, batch_no,
      expiry_date, location, notes, supplier_id,
    } = req.body;

    if (!product_id || !warehouse_id || !quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'product_id, warehouse_id and quantity > 0 are required' });
    }

    // Scope check for manager/staff
    const scope = await getWarehouseScope(req);
    if (scope !== null && !scope.includes(Number(warehouse_id))) {
      await t.rollback();
      return res.status(403).json({ success: false, error: 'You do not have access to this warehouse' });
    }

    const product = await Product.unscoped().findByPk(product_id, { transaction: t });
    if (!product) { await t.rollback(); return res.status(404).json({ success: false, error: 'Product not found' }); }

    let inv = await Inventory.findOne({
      where: { product_id, warehouse_id },
      transaction: t,
    });

    const oldQty = inv?.quantity ?? 0;
    const newQty = oldQty + Number(quantity);

    if (inv) {
      await inv.update({
        quantity: newQty,
        ...(batch_no   && { batch_no }),
        ...(expiry_date && { expiry_date }),
        ...(location   && { location }),
      }, { transaction: t });
    } else {
      inv = await Inventory.create({
        product_id, warehouse_id,
        quantity: newQty,
        batch_no:    batch_no    || null,
        expiry_date: expiry_date || null,
        location:    location    || null,
        reserved_qty: 0,
      }, { transaction: t });
    }

    await t.commit();

    await auditLog(req, 'create', {
      action: 'STOCK_IN', product_id, warehouse_id,
      qty_added: quantity, old_qty: oldQty, new_qty: newQty,
      batch_no, expiry_date, location, notes, supplier_id,
    });

    return res.status(201).json({
      success: true,
      data: { ...formatRow(inv), message: `Stock increased by ${quantity}` },
    });
  } catch (err) {
    await t.rollback();
    logger.error(`stockIn: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/inventory/stock-out
═══════════════════════════════════════════════════════════════ */
export async function stockOut(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { product_id, warehouse_id, quantity, reason, reference_no } = req.body;

    if (!product_id || !warehouse_id || !quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'product_id, warehouse_id and quantity > 0 are required' });
    }

    const scope = await getWarehouseScope(req);
    if (scope !== null && !scope.includes(Number(warehouse_id))) {
      await t.rollback();
      return res.status(403).json({ success: false, error: 'Access denied for this warehouse' });
    }

    const inv = await Inventory.findOne({
      where: { product_id, warehouse_id },
      transaction: t,
    });

    if (!inv) { await t.rollback(); return res.status(404).json({ success: false, error: 'No inventory found for this product/warehouse' }); }

    const available = inv.quantity - (inv.reserved_qty || 0);
    if (Number(quantity) > available) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: `Insufficient available stock. Available: ${available}, Requested: ${quantity}`,
      });
    }

    const oldQty = inv.quantity;
    const newQty = oldQty - Number(quantity);
    await inv.update({ quantity: newQty }, { transaction: t });
    await t.commit();

    await auditLog(req, 'update', {
      action: 'STOCK_OUT', product_id, warehouse_id,
      qty_removed: quantity, old_qty: oldQty, new_qty: newQty,
      reason, reference_no,
    });

    return res.json({ success: true, data: { ...formatRow(inv), message: `Stock decreased by ${quantity}` } });
  } catch (err) {
    await t.rollback();
    logger.error(`stockOut: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/inventory/adjust  (Admin / Manager)
═══════════════════════════════════════════════════════════════ */
export async function adjustStock(req, res, next) {
  try {
    const { inventory_id, new_qty, reason, notes } = req.body;

    if (inventory_id === undefined || new_qty === undefined) {
      return res.status(400).json({ success: false, error: 'inventory_id and new_qty are required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Reason is required for adjustments' });
    }

    const scope = await getWarehouseScope(req);
    const whWhere = buildWhereFromScope(scope);

    const inv = await Inventory.findOne({ where: { id: inventory_id, ...whWhere } });
    if (!inv) return res.status(404).json({ success: false, error: 'Inventory record not found or access denied' });

    const newQty = Math.max(0, Number(new_qty));
    const oldQty = inv.quantity;
    await inv.update({ quantity: newQty });

    await auditLog(req, 'update', {
      action: 'STOCK_ADJUST', inventory_id,
      old_qty: oldQty, new_qty: newQty,
      delta: newQty - oldQty, reason, notes,
    });

    // Reload with associations
    await inv.reload({ include: fullInclude });
    return res.json({ success: true, data: formatRow(inv) });
  } catch (err) {
    logger.error(`adjustStock: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/inventory/transfer
═══════════════════════════════════════════════════════════════ */
export async function transferStock(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { product_id, fromWarehouseId, toWarehouseId, quantity, notes,
      from_warehouse_id, to_warehouse_id } = req.body;

    const fromWH = fromWarehouseId || from_warehouse_id;
    const toWH   = toWarehouseId   || to_warehouse_id;
    const qty    = Number(quantity);

    if (!product_id || !fromWH || !toWH || !qty || qty <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'product_id, fromWarehouseId, toWarehouseId and quantity > 0 required' });
    }
    if (String(fromWH) === String(toWH)) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Source and destination warehouses must differ' });
    }

    // Scope check: manager can only transfer FROM their warehouse
    const scope = await getWarehouseScope(req);
    if (scope !== null && !scope.includes(Number(fromWH))) {
      await t.rollback();
      return res.status(403).json({ success: false, error: 'You can only transfer from your managed warehouse' });
    }

    const src = await Inventory.findOne({ where: { product_id, warehouse_id: fromWH }, transaction: t });
    if (!src) { await t.rollback(); return res.status(404).json({ success: false, error: 'Source inventory not found' }); }

    const available = src.quantity - (src.reserved_qty || 0);
    if (qty > available) {
      await t.rollback();
      return res.status(400).json({ success: false, error: `Insufficient available stock: ${available}` });
    }

    const oldSrcQty = src.quantity;
    await src.update({ quantity: src.quantity - qty }, { transaction: t });

    let dst = await Inventory.findOne({ where: { product_id, warehouse_id: toWH }, transaction: t });
    const oldDstQty = dst?.quantity ?? 0;

    if (dst) {
      await dst.update({ quantity: dst.quantity + qty }, { transaction: t });
    } else {
      dst = await Inventory.create({ product_id, warehouse_id: toWH, quantity: qty, reserved_qty: 0 }, { transaction: t });
    }

    await t.commit();

    await auditLog(req, 'update', {
      action: 'STOCK_TRANSFER', product_id,
      from_warehouse_id: fromWH, to_warehouse_id: toWH, quantity: qty,
      from_old: oldSrcQty, from_new: src.quantity,
      to_old: oldDstQty, to_new: dst.quantity,
      notes,
    });

    return res.json({
      success: true,
      data: {
        message: `Transferred ${qty} units from WH#${fromWH} to WH#${toWH}`,
        source: { warehouse_id: fromWH, old_qty: oldSrcQty, new_qty: src.quantity },
        dest:   { warehouse_id: toWH,   old_qty: oldDstQty, new_qty: dst.quantity },
      },
    });
  } catch (err) {
    await t.rollback();
    logger.error(`transferStock: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/inventory/low-stock
═══════════════════════════════════════════════════════════════ */
export async function getLowStock(req, res, next) {
  try {
    const scope   = await getWarehouseScope(req);
    const whWhere = buildWhereFromScope(scope);

    const rows = await Inventory.findAll({
      where: { quantity: { [Op.gt]: 0 }, ...whWhere },
      include: fullInclude,
      limit: 100,
      order: [['quantity', 'ASC']],
    });

    const low = rows
      .map((r) => formatRow(r))
      .filter((r) => r.stockStatus === 'low_stock');

    return res.json({ success: true, data: low, count: low.length });
  } catch (err) {
    logger.error(`getLowStock: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/inventory/valuation
═══════════════════════════════════════════════════════════════ */
export async function getValuation(req, res, next) {
  try {
    const scope   = await getWarehouseScope(req);
    const whParam = scope !== null ? scope.join(',') : null;
    const whSQL   = whParam ? `WHERE i.warehouse_id IN (${whParam})` : '';

    // Subquery: aggregated inventory by product
    const [summary] = await sequelize.query(
      `SELECT
         COUNT(DISTINCT prod_inv.product_id) AS unique_products,
         COALESCE(SUM(prod_inv.total_qty), 0) AS total_qty,
         COALESCE(SUM(prod_inv.total_value), 0) AS total_value,
         COUNT(CASE WHEN prod_inv.total_qty = 0 THEN 1 END) AS out_of_stock,
         COUNT(CASE WHEN prod_inv.total_qty > 0 AND prod_inv.total_qty <= prod_inv.reorder_level THEN 1 END) AS low_stock
       FROM (
         SELECT
           i.product_id,
           p.reorder_level,
           SUM(i.quantity) AS total_qty,
           SUM(i.quantity * p.unit_price) AS total_value
         FROM inventory i
         JOIN products p ON i.product_id = p.product_id
         ${whSQL}
         GROUP BY i.product_id, p.reorder_level
       ) AS prod_inv`,
      { type: sequelize.QueryTypes.SELECT },
    );

    const breakdown = await sequelize.query(
      `SELECT
         w.warehouse_id, w.name AS warehouse_name, w.city,
         COUNT(DISTINCT i.product_id) AS unique_products,
         COALESCE(SUM(i.quantity), 0) AS total_qty,
         COALESCE(SUM(i.quantity * p.unit_price), 0) AS stock_value
       FROM warehouses w
       LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
       LEFT JOIN products p  ON i.product_id   = p.product_id
       ${whParam ? `WHERE w.warehouse_id IN (${whParam})` : ''}
       GROUP BY w.warehouse_id, w.name, w.city
       ORDER BY stock_value DESC`,
      { type: sequelize.QueryTypes.SELECT },
    );

    return res.json({
      success: true,
      data: {
        totalUniqueProducts: Number(summary?.unique_products || 0),
        totalQty:            Number(summary?.total_qty       || 0),
        totalValue:          Number(summary?.total_value     || 0),
        outOfStockCount:     Number(summary?.out_of_stock    || 0),
        lowStockCount:       Number(summary?.low_stock       || 0),
        warehouseBreakdown:  breakdown.map((r) => ({
          warehouseId:      r.warehouse_id,
          warehouseName:    r.warehouse_name,
          city:             r.city,
          uniqueProducts:   Number(r.unique_products),
          totalQty:         Number(r.total_qty),
          stockValue:       Number(r.stock_value),
        })),
      },
    });
  } catch (err) {
    logger.error(`getValuation: ${err.message}`);
    next(err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/inventory/summary  (kept for backward compat)
═══════════════════════════════════════════════════════════════ */
export async function getInventorySummary(req, res, next) {
  // Delegate to valuation
  return getValuation(req, res, next);
}

/* ═══════════════════════════════════════════════════════════════
   PUT /api/inventory/:id  (legacy update — kept for compatibility)
═══════════════════════════════════════════════════════════════ */
export async function updateStock(req, res, next) {
  try {
    const { id } = req.params;
    const { quantity, reason } = req.body;

    if (quantity < 0) return res.status(400).json({ success: false, error: 'Quantity must be >= 0' });

    const inv = await Inventory.findByPk(id);
    if (!inv) return res.status(404).json({ success: false, error: 'Inventory item not found' });

    const scope = await getWarehouseScope(req);
    if (scope !== null && !scope.includes(inv.warehouse_id)) {
      return res.status(403).json({ success: false, error: 'Access denied for this warehouse' });
    }

    const oldQty = inv.quantity;
    await inv.update({ quantity });
    await auditLog(req, 'update', { action: 'UPDATE_STOCK', inventory_id: id, old_qty: oldQty, new_qty: quantity, reason });

    return res.json({ success: true, data: inv });
  } catch (err) { next(err); }
}

/* ── row formatter ───────────────────────────────────────────── */
function formatRow(inv) {
  const i = inv.toJSON ? inv.toJSON() : inv;
  const p = i.product || {};
  const w = i.warehouse || {};
  const reserved   = i.reserved_qty ?? 0;
  const available  = Math.max(0, i.quantity - reserved);
  const unitPrice  = parseFloat(p.unit_price || 0);
  const stockStatus = computeStockStatus(i.quantity, p.reorder_level ?? 10);

  return {
    id:              i.id,
    inventory_id:    i.id,
    product_id:      i.product_id,
    warehouse_id:    i.warehouse_id,
    quantity:        i.quantity,
    reserved_qty:    reserved,
    available_qty:   available,
    batch_no:        i.batch_no,
    expiry_date:     i.expiry_date,
    location:        i.location,
    updated_at:      i.updated_at,
    // from product
    product_name:    p.name,
    sku:             p.sku,
    category:        p.category,
    unit:            p.unit,
    unit_price:      unitPrice,
    reorder_level:   p.reorder_level,
    image_url:       p.image_url,
    // from warehouse
    warehouse_name:  w.name,
    warehouse_city:  w.city,
    // computed
    stockValue:      i.quantity * unitPrice,
    stockStatus,
  };
}
