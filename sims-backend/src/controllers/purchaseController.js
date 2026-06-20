import { Op } from 'sequelize';
import {
  PurchaseOrder, Product, Supplier, Inventory,
  Warehouse, AuditLog, User, sequelize,
} from '../models/index.js';
import logger from '../config/logger.js';
import NotificationService from '../services/notificationService.js';

/* ── helpers ─────────────────────────────────────────────────── */
const uid  = (req) => req.user?.user_id || req.user?.id;
const role = (req) => req.user?.role;

function genPONumber() {
  const d = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${d}-${r}`;
}

async function getManagedWarehouseIds(req) {
  if (role(req) === 'admin') return null;
  const whs = await Warehouse.findAll({ where: { manager_id: uid(req) }, attributes: ['warehouse_id'] });
  return whs.map((w) => w.warehouse_id);
}

function parseItems(rawItems) {
  if (!rawItems) return [];
  if (Array.isArray(rawItems)) return rawItems;
  try { return JSON.parse(rawItems); } catch { return []; }
}

async function audit(req, action, changes) {
  try {
    await AuditLog.create({
      user_id: uid(req), action, table_name: 'purchase_orders', changes, ip_address: req.ip,
    });
  } catch (e) { logger.warn(`PO audit log failed: ${e.message}`); }
}

const PO_INCLUDE = [
  { model: Supplier,  as: 'supplier',          attributes: ['supplier_id', 'name', 'contact_person', 'email', 'phone', 'rating', 'lead_time'] },
  { model: Warehouse, as: 'warehouse',          attributes: ['warehouse_id', 'name', 'location'] },
  { model: User,      as: 'created_by_user',   attributes: ['id', 'first_name', 'last_name', 'email'] },
  { model: User,      as: 'approved_by_user',  attributes: ['id', 'first_name', 'last_name', 'email'] },
  { model: User,      as: 'received_by_user',  attributes: ['id', 'first_name', 'last_name', 'email'] },
];

function formatPO(po) {
  const json = po.toJSON ? po.toJSON() : po;
  json.items = parseItems(json.items);
  // Compute grand total from items
  const subtotal = json.items.reduce((s, i) => s + (Number(i.total_cost || 0) || (i.quantity * i.unit_cost) || 0), 0);
  const tax      = subtotal * (Number(json.tax_percent || 0) / 100);
  json.subtotal    = subtotal;
  json.grand_total = subtotal + tax;
  return json;
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/purchase-orders
═══════════════════════════════════════════════════════════════ */
export const getPurchaseOrders = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { status, supplier_id, date_from, date_to, search } = req.query;

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (supplier_id) where.supplier_id = supplier_id;
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = new Date(date_from);
      if (date_to)   where.order_date[Op.lte] = new Date(date_to);
    }
    if (search) where.po_number = { [Op.like]: `%${search}%` };

    // Warehouse isolation for manager
    const warehouseIds = await getManagedWarehouseIds(req);
    if (warehouseIds !== null) {
      where.warehouse_id = warehouseIds.length ? { [Op.in]: warehouseIds } : -1;
    }

    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      include: PO_INCLUDE,
      order:  [['created_at', 'DESC']],
      limit, offset, distinct: true,
    });

    return res.json({
      success: true,
      data: {
        orders:     rows.map(formatPO),
        total:      count,
        page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) { logger.error(`getPurchaseOrders: ${err.message}`); next(err); }
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/purchase-orders/:id
═══════════════════════════════════════════════════════════════ */
export const getPurchaseOrderById = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, { include: PO_INCLUDE });
    if (!po) return res.status(404).json({ success: false, error: 'Purchase order not found' });

    // Warehouse access check
    const warehouseIds = await getManagedWarehouseIds(req);
    if (warehouseIds !== null && po.warehouse_id && !warehouseIds.includes(po.warehouse_id)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.json({ success: true, data: formatPO(po) });
  } catch (err) { logger.error(`getPurchaseOrderById: ${err.message}`); next(err); }
};

/* ═══════════════════════════════════════════════════════════════
   POST /api/purchase-orders   (creates in draft)
═══════════════════════════════════════════════════════════════ */
export const createPurchaseOrder = async (req, res, next) => {
  try {
    const {
      supplier_id, warehouse_id, expected_delivery,
      items = [], notes, tax_percent = 0,
    } = req.body;

    if (!supplier_id || !items.length) {
      return res.status(400).json({ success: false, error: 'supplier_id and at least one item are required' });
    }

    const supplier = await Supplier.findByPk(supplier_id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });

    // Resolve warehouse
    let resolvedWH = warehouse_id;
    if (!resolvedWH && role(req) !== 'admin') {
      const wh = await Warehouse.findOne({ where: { manager_id: uid(req) } });
      resolvedWH = wh?.warehouse_id ?? null;
    }

    // Build line items
    let total_amount = 0;
    const lineItems = [];
    for (const item of items) {
      const product = await Product.unscoped().findByPk(item.product_id);
      if (!product) return res.status(404).json({ success: false, error: `Product ${item.product_id} not found` });
      const qty        = Number(item.quantity) || 0;
      const unit_cost  = Number(item.unit_cost || item.unit_price || product.cost_price || product.unit_price || 0);
      const total_cost = qty * unit_cost;
      total_amount += total_cost;
      lineItems.push({
        product_id:   product.product_id,
        product_name: product.name,
        sku:          product.sku,
        quantity:     qty,
        unit_cost,
        total_cost,
      });
    }

    const po = await PurchaseOrder.create({
      po_number:          genPONumber(),
      supplier_id,
      warehouse_id:       resolvedWH,
      order_date:         new Date(),
      expected_delivery:  expected_delivery ? new Date(expected_delivery) : null,
      status:             'draft',
      total_amount,
      tax_percent,
      created_by:         uid(req),
      items:              JSON.stringify(lineItems),
      notes:              notes || null,
    });

    await audit(req, 'CREATE_PURCHASE_ORDER', { po_number: po.po_number, total_amount });
    logger.info(`PO created: ${po.po_number}`);

    const full = await PurchaseOrder.findByPk(po.po_id, { include: PO_INCLUDE });
    // Fire notification (non-blocking)
    NotificationService.onPOCreated(po, uid(req)).catch(() => {});
    return res.status(201).json({ success: true, data: formatPO(full) });
  } catch (err) { logger.error(`createPurchaseOrder: ${err.message}`); next(err); }
};

/* ═══════════════════════════════════════════════════════════════
   PUT /api/purchase-orders/:id   (only draft/submitted)
═══════════════════════════════════════════════════════════════ */
export const updatePurchaseOrder = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ success: false, error: 'Purchase order not found' });
    if (!['draft', 'submitted'].includes(po.status)) {
      return res.status(400).json({ success: false, error: `Cannot edit a PO with status "${po.status}"` });
    }

    const { supplier_id, warehouse_id, expected_delivery, items, notes, tax_percent } = req.body;
    const old = po.toJSON();

    if (supplier_id)      po.supplier_id      = supplier_id;
    if (warehouse_id)     po.warehouse_id     = warehouse_id;
    if (expected_delivery) po.expected_delivery = new Date(expected_delivery);
    if (notes !== undefined) po.notes          = notes;
    if (tax_percent !== undefined) po.tax_percent = tax_percent;

    if (items?.length) {
      let total_amount = 0;
      const lineItems = [];
      for (const item of items) {
        const product = await Product.unscoped().findByPk(item.product_id);
        if (!product) return res.status(404).json({ success: false, error: `Product ${item.product_id} not found` });
        const qty       = Number(item.quantity) || 0;
        const unit_cost = Number(item.unit_cost || item.unit_price || 0);
        const total_cost = qty * unit_cost;
        total_amount += total_cost;
        lineItems.push({ product_id: product.product_id, product_name: product.name, sku: product.sku, quantity: qty, unit_cost, total_cost });
      }
      po.items        = JSON.stringify(lineItems);
      po.total_amount = total_amount;
    }

    await po.save();
    await audit(req, 'UPDATE_PURCHASE_ORDER', { before: old, after: po.toJSON() });

    const full = await PurchaseOrder.findByPk(po.po_id, { include: PO_INCLUDE });
    return res.json({ success: true, data: formatPO(full) });
  } catch (err) { logger.error(`updatePurchaseOrder: ${err.message}`); next(err); }
};

/* ── Status transition helpers ────────────────────────────── */
async function transition(req, res, next, fromStatuses, toStatus, extraFields = {}) {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ success: false, error: 'Purchase order not found' });
    if (!fromStatuses.includes(po.status)) {
      return res.status(400).json({ success: false, error: `Cannot ${toStatus} a PO with status "${po.status}"` });
    }
    const old = po.status;
    po.status = toStatus;
    Object.assign(po, extraFields);
    await po.save();
    await audit(req, `${toStatus.toUpperCase()}_PURCHASE_ORDER`, { status: { from: old, to: toStatus } });

    const full = await PurchaseOrder.findByPk(po.po_id, { include: PO_INCLUDE });

    // Fire notifications asynchronously — never block the response
    const poData = po.toJSON();
    if (toStatus === 'submitted')  NotificationService.onPOSubmitted(poData, uid(req)).catch(() => {});
    if (toStatus === 'approved')   NotificationService.onPOApproved(poData, uid(req)).catch(() => {});
    if (toStatus === 'shipped')    NotificationService.onPOShipped(poData).catch(() => {});
    if (toStatus === 'cancelled')  NotificationService.onPOCancelled(poData, uid(req)).catch(() => {});

    return res.json({ success: true, data: formatPO(full) });
  } catch (err) { logger.error(`PO transition to ${toStatus}: ${err.message}`); next(err); }
}

/* ═══════════════════════════════════════════════════════════════
   POST /:id/submit   (draft → submitted)
═══════════════════════════════════════════════════════════════ */
export const submitPurchaseOrder = (req, res, next) =>
  transition(req, res, next, ['draft'], 'submitted');

/* ═══════════════════════════════════════════════════════════════
   POST /:id/approve  (submitted → approved)
═══════════════════════════════════════════════════════════════ */
export const approvePurchaseOrder = (req, res, next) =>
  transition(req, res, next, ['submitted'], 'approved', { approved_by: uid(req) });

/* ═══════════════════════════════════════════════════════════════
   POST /:id/ship     (approved → shipped)
═══════════════════════════════════════════════════════════════ */
export const shipPurchaseOrder = (req, res, next) =>
  transition(req, res, next, ['approved'], 'shipped');

/* ═══════════════════════════════════════════════════════════════
   POST /:id/receive  (shipped → received, creates stock-in records)
   Body: { warehouse_id?, received_items: [{ product_id, quantity_received, batch_no?, expiry_date? }] }
═══════════════════════════════════════════════════════════════ */
export const receivePurchaseOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, { transaction: t });
    if (!po) { await t.rollback(); return res.status(404).json({ success: false, error: 'Purchase order not found' }); }
    if (!['approved', 'shipped'].includes(po.status)) {
      await t.rollback();
      return res.status(400).json({ success: false, error: `PO must be approved or shipped to receive. Current: "${po.status}"` });
    }

    const { received_items = [], warehouse_id } = req.body;
    const targetWH = warehouse_id || po.warehouse_id;
    if (!targetWH) { await t.rollback(); return res.status(400).json({ success: false, error: 'warehouse_id is required' }); }

    // Upsert inventory for each received item
    for (const item of received_items) {
      const qtyReceived = Number(item.quantity_received) || 0;
      if (qtyReceived <= 0) continue;

      let inv = await Inventory.findOne({ where: { product_id: item.product_id, warehouse_id: targetWH }, transaction: t });
      if (inv) {
        await inv.update({ quantity: inv.quantity + qtyReceived, ...(item.batch_no && { batch_no: item.batch_no }), ...(item.expiry_date && { expiry_date: item.expiry_date }) }, { transaction: t });
      } else {
        await Inventory.create({
          product_id:   item.product_id,
          warehouse_id: targetWH,
          quantity:     qtyReceived,
          batch_no:     item.batch_no   || null,
          expiry_date:  item.expiry_date || null,
          reserved_qty: 0,
        }, { transaction: t });
      }
    }

    // Update PO
    po.status      = 'received';
    po.received_by = uid(req);
    if (!po.warehouse_id) po.warehouse_id = targetWH;
    await po.save({ transaction: t });

    await AuditLog.create({
      user_id: uid(req), action: 'RECEIVE_PURCHASE_ORDER',
      table_name: 'purchase_orders',
      changes: { po_number: po.po_number, warehouse_id: targetWH, received_items },
      ip_address: req.ip,
    }, { transaction: t });

    await t.commit();
    logger.info(`PO received: ${po.po_number}`);

    const full = await PurchaseOrder.findByPk(po.po_id, { include: PO_INCLUDE });
    // Fire notification (non-blocking)
    NotificationService.onPOReceived(po.toJSON(), uid(req)).catch(() => {});
    return res.json({ success: true, data: formatPO(full) });
  } catch (err) {
    await t.rollback();
    logger.error(`receivePurchaseOrder: ${err.message}`);
    next(err);
  }
};

/* ═══════════════════════════════════════════════════════════════
   POST /:id/cancel  (Admin only — any status except received)
═══════════════════════════════════════════════════════════════ */
export const cancelPurchaseOrder = (req, res, next) =>
  transition(req, res, next, ['draft', 'submitted', 'approved', 'shipped'], 'cancelled');

/* ═══════════════════════════════════════════════════════════════
   Exported helper for cron job auto-generation
═══════════════════════════════════════════════════════════════ */
export async function autoCreatePO({ supplier_id, warehouse_id, product_id, product_name, product_sku, unit_cost, quantity, notes, created_by }) {
  const lineItems = [{
    product_id, product_name, sku: product_sku,
    quantity, unit_cost, total_cost: quantity * unit_cost,
  }];
  return PurchaseOrder.create({
    po_number:    genPONumber(),
    supplier_id,
    warehouse_id: warehouse_id || null,
    order_date:   new Date(),
    status:       'draft',
    total_amount: quantity * unit_cost,
    tax_percent:  0,
    created_by,
    auto_drafted: true,
    items:        JSON.stringify(lineItems),
    notes:        notes || `Auto-drafted: low stock detected`,
  });
}
