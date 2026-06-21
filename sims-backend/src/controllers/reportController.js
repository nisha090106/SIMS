import { Op, fn, col, literal } from 'sequelize';
import {
  Product, Inventory, Warehouse, PurchaseOrder, SalesOrder,
  AuditLog, User, Request, RequestItem, Supplier, ReorderRule, sequelize,
} from '../models/index.js';
import asyncHandler from 'express-async-handler';
import logger from '../config/logger.js';
import { Parser } from 'json2csv';
import { resolveManagedWarehouseIdsForUser } from '../utils/warehouseAccess.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the warehouse_id WHERE clause for the current user.
 * - admin: no restriction unless warehouseId query param is provided
 * - manager: restricted to warehouses they manage
 */
async function warehouseScope(req, warehouseIdParam) {
  const { role, id: userId } = req.user;

  if (role === 'manager') {
    const ids = await resolveManagedWarehouseIdsForUser({ id: userId, role, email: req.user?.email });
    return ids?.length ? { [Op.in]: ids } : { [Op.in]: [-1] };
  }

  if (role === 'staff') {
    const ids = await resolveManagedWarehouseIdsForUser({ id: userId, role, email: req.user?.email });
    return ids?.length ? { [Op.in]: ids } : { [Op.in]: [-1] };
  }

  if (role === 'admin' && warehouseIdParam) {
    return parseInt(warehouseIdParam);
  }

  return null; // admin with no filter — unrestricted
}

/** Pagination helper */
function getPagination(query) {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function getDisplayName(user, fallback = 'System') {
  if (!user) return fallback;
  if (typeof user === 'string') {
    const trimmed = user.trim();
    return trimmed || fallback;
  }

  const parts = [user.first_name, user.last_name].filter(Boolean).map((part) => String(part).trim());
  const composed = parts.join(' ').trim();
  if (composed) return composed;

  if (typeof user.full_name === 'string') {
    const trimmed = user.full_name.trim();
    if (trimmed) return trimmed;
  }

  if (typeof user.email === 'string' && user.email.trim()) {
    return user.email.trim();
  }

  return fallback;
}

export function buildLiveLowStockCondition() {
  return 'i.quantity <= p.reorder_level';
}

// ─── Controller ─────────────────────────────────────────────────────────────

class ReportController {

  // ── GET /api/reports/dashboard ──────────────────────────────────────────
  static getDashboardStats = asyncHandler(async (req, res) => {
    const whScope = await warehouseScope(req, req.query.warehouseId);
    const invWhere = whScope ? { warehouse_id: whScope } : {};

    const [totalProducts, stockValueRows, lowStockRows, draftSubmittedOrdersCount,
      warehouseStock, categoryDist, recentLogs] = await Promise.all([
      Product.count(),
      sequelize.query(
        `SELECT COALESCE(SUM(i.quantity * p.unit_price), 0) AS total_value
         FROM inventory i JOIN products p ON i.product_id = p.product_id
         ${whScope ? 'WHERE i.warehouse_id IN (SELECT warehouse_id FROM warehouses WHERE manager_id = :uid)' : ''}`,
        { type: sequelize.QueryTypes.SELECT, replacements: { uid: req.user.id } },
      ),
      sequelize.query(
        `SELECT COUNT(DISTINCT i.product_id) AS cnt
         FROM inventory i JOIN products p ON i.product_id = p.product_id
         WHERE i.quantity <= p.reorder_level`,
        { type: sequelize.QueryTypes.SELECT },
      ),
      PurchaseOrder.count({ where: { status: { [Op.in]: ['draft', 'submitted'] } } }),
      sequelize.query(
        `SELECT w.name AS warehouse, COALESCE(SUM(i.quantity), 0) AS totalStock
         FROM warehouses w LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
         GROUP BY w.warehouse_id, w.name`,
        { type: sequelize.QueryTypes.SELECT },
      ),
      sequelize.query(
        'SELECT category, COUNT(*) AS cnt FROM products GROUP BY category',
        { type: sequelize.QueryTypes.SELECT },
      ),
      AuditLog.findAll({
        limit: 5,
        order: [['timestamp', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'full_name'] }],
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalStockValue: Number(stockValueRows[0]?.total_value || 0),
        lowStockCount:   Number(lowStockRows[0]?.cnt || 0),
        draftSubmittedOrdersCount,
        warehouseStockData:   warehouseStock.map(r => ({ warehouse: r.warehouse, totalStock: Number(r.totalStock || 0) })),
        categoryDistribution: categoryDist.map(r => ({ category: r.category, count: Number(r.cnt || 0) })),
        recentActivity:       recentLogs.map(l => ({
          action:    l.action,
          user:      getDisplayName(l.user),
          timestamp: l.timestamp,
        })),
      },
    });
  });


  // ── GET /api/reports/inventory ──────────────────────────────────────────
  // Full inventory report with valuation, filtering, and pagination
  static getInventoryReport = asyncHandler(async (req, res) => {
    const { warehouseId, category, search, status } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const whScope = await warehouseScope(req, warehouseId);
    const invWhere = {};
    if (whScope) invWhere.warehouse_id = whScope;

    // Build product include filters
    const productWhere = {};
    if (category) productWhere.category = category;
    if (search)   productWhere.name = { [Op.like]: `%${search}%` };

    if (status === 'out_of_stock')  invWhere.quantity = 0;

    const inventoryWhere = status === 'low_stock'
      ? { ...invWhere, [Op.and]: [literal(buildLiveLowStockCondition())] }
      : invWhere;

    let allRows = await Inventory.findAll({
      where: inventoryWhere,
      include: [
        { model: Product,   as: 'product',   where: productWhere, attributes: ['product_id', 'sku', 'name', 'category', 'unit_price', 'cost_price', 'reorder_level', 'reorder_qty'] },
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'name', 'location'] },
      ],
      order: [['product', 'name', 'ASC']],
    });

    const count = allRows.length;
    const paginatedRows = allRows.slice(offset, offset + limit);

    // Compute per-item valuation
    const items = paginatedRows.map(inv => {
      const qty       = inv.quantity || 0;
      const unitCost  = Number(inv.product.unit_price || 0);
      const costPrice = Number(inv.product.cost_price  || unitCost);
      const totalValue  = qty * unitCost;
      const totalCost   = qty * costPrice;
      const reorderLvl  = inv.product.reorder_level || 0;
      const stockStatus = qty === 0 ? 'out_of_stock' : qty <= reorderLvl ? 'low_stock' : 'in_stock';

      return {
        inventoryId:  inv.id,
        sku:          inv.product.sku,
        name:         inv.product.name,
        category:     inv.product.category,
        quantity:     qty,
        reservedQty:  inv.reserved_qty || 0,
        availableQty: Math.max(0, qty - (inv.reserved_qty || 0)),
        unitPrice:    unitCost,
        costPrice,
        totalValue,
        totalCost,
        reorderLevel: reorderLvl,
        reorderQty:   inv.product.reorder_qty,
        stockStatus,
        batchNo:      inv.batch_no   || null,
        expiryDate:   inv.expiry_date || null,
        location:     inv.location   || null,
        warehouse:    inv.warehouse.name,
        warehouseId:  inv.warehouse.warehouse_id,
        warehouseLocation: inv.warehouse.location,
      };
    });

    // Aggregate totals across all matching records
    const totalUnits  = allRows.reduce((s, r) => s + (r.quantity || 0), 0);
    const totalValue  = allRows.reduce((s, r) => s + (r.quantity || 0) * Number(r.product.unit_price || 0), 0);
    const totalCost   = allRows.reduce((s, r) => s + (r.quantity || 0) * Number(r.product.cost_price || r.product.unit_price || 0), 0);
    const uniqueSkus  = new Set(allRows.map(r => r.product.sku)).size;

    const catMap = {};
    allRows.forEach(r => {
      const cat = r.product.category || 'Uncategorized';
      if (!catMap[cat]) catMap[cat] = { category: cat, units: 0, value: 0 };
      catMap[cat].units += r.quantity || 0;
      catMap[cat].value += (r.quantity || 0) * Number(r.product.unit_price || 0);
    });

    res.json({
      success: true,
      data: {
        summary: { totalSkus: uniqueSkus, totalUnits, totalValue, totalCost, grossMarginValue: totalValue - totalCost },
        categoryBreakdown: Object.values(catMap),
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
        items,
      },
    });
  });


  // ── GET /api/reports/inventory-valuation (legacy kept) ──────────────────
  static getInventoryValuation = asyncHandler(async (req, res) => {
    const { warehouseId, category } = req.query;
    const whScope = await warehouseScope(req, warehouseId);
    const invWhere = {};
    if (whScope) invWhere.warehouse_id = whScope;

    const rows = await Inventory.findAll({
      where: invWhere,
      include: [
        { model: Product,   as: 'product',   attributes: ['product_id', 'sku', 'name', 'category', 'unit_price', 'cost_price'] },
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'name'] },
      ],
    });

    const filtered = category ? rows.filter(r => r.product.category === category) : rows;

    const catValues = {};
    filtered.forEach(r => {
      const cat = r.product.category || 'Uncategorized';
      const val = (r.quantity || 0) * Number(r.product.unit_price || 0);
      catValues[cat] = (catValues[cat] || 0) + val;
    });

    const items = filtered.map(r => ({
      sku:        r.product.sku,
      name:       r.product.name,
      category:   r.product.category,
      quantity:   r.quantity,
      unitCost:   Number(r.product.unit_price || 0),
      costPrice:  Number(r.product.cost_price || r.product.unit_price || 0),
      totalValue: (r.quantity || 0) * Number(r.product.unit_price || 0),
      totalCost:  (r.quantity || 0) * Number(r.product.cost_price || r.product.unit_price || 0),
      warehouse:  r.warehouse.name,
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalSkus:  new Set(filtered.map(r => r.product.sku)).size,
          totalUnits: filtered.reduce((s, r) => s + (r.quantity || 0), 0),
          totalValue: items.reduce((s, i) => s + i.totalValue, 0),
          totalCost:  items.reduce((s, i) => s + i.totalCost,  0),
        },
        categoryValues: catValues,
        items,
      },
    });
  });


  // ── GET /api/reports/stock-movement ─────────────────────────────────────
  static getStockMovement = asyncHandler(async (req, res) => {
    const { warehouseId, productId, from, to, action: actionFilter } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    // AuditLog has no warehouse_id — use product_id + date range as primary filters
    const where = {};
    if (actionFilter) {
      where.action = actionFilter;
    } else {
      where.action = {
        [Op.in]: [
          'create', 'update', 'BARCODE_SCAN',
          'RECEIVE_PURCHASE_ORDER', 'REQUEST_FULFILLED',
        ],
      };
    }

    if (from && to) where.timestamp = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
    else if (from)  where.timestamp = { [Op.gte]: new Date(from) };
    else if (to)    where.timestamp = { [Op.lte]: new Date(to + 'T23:59:59') };

    // Scope managers to their own user_id in logs
    if (req.user.role === 'manager') {
      where.user_id = req.user.id;
    } else if (req.user.role !== 'admin') {
      where.user_id = req.user.id;
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'full_name'] }],
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    // Build action frequency summary
    const allLogs = await AuditLog.findAll({
      where,
      attributes: ['action'],
    });
    const actionBreakdown = allLogs.reduce((acc, l) => {
      acc[l.action] = (acc[l.action] || 0) + 1;
      return acc;
    }, {});

    const items = rows.map(log => {
      const changes = log.changes || {};
      const u = log.user;
      return {
        logId:     log.log_id,
        timestamp: log.timestamp,
        user:      u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'System' : 'System',
        action:    log.action,
        entity:    log.table_name,
        quantityChange: changes.quantity_change ?? changes.quantity ?? null,
        reference: changes.reference_id || changes.po_number || changes.request_number || '-',
        details:   changes,
        ipAddress: log.ip_address || null,
      };
    });

    res.json({
      success: true,
      data: {
        summary:  { totalMovements: count, actionBreakdown },
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
        items,
      },
    });
  });


  // ── GET /api/reports/low-stock ───────────────────────────────────────────
  static getLowStock = asyncHandler(async (req, res) => {
    const { warehouseId, category } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const whScope = await warehouseScope(req, warehouseId);
    const invWhere = {};
    if (whScope) invWhere.warehouse_id = whScope;

    const productWhere = {};
    if (category) productWhere.category = category;

    const lowStockCondition = buildLiveLowStockCondition();

    const allLow = await Inventory.findAll({
      where: {
        ...invWhere,
        [Op.and]: [
          literal(`${lowStockCondition}`),
        ],
      },
      include: [
        {
          model: Product, as: 'product', where: productWhere,
          attributes: ['product_id', 'sku', 'name', 'category', 'reorder_level', 'reorder_qty', 'unit_price'],
        },
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'name'] },
      ],
    });

    const lowItems = allLow.filter(inv => inv.quantity <= (inv.product.reorder_level || 0));
    const total    = lowItems.length;
    const paginated = lowItems.slice(offset, offset + limit);

    const items = paginated.map(inv => ({
      sku:          inv.product.sku,
      name:         inv.product.name,
      category:     inv.product.category,
      currentQty:   inv.quantity,
      reorderLevel: inv.product.reorder_level,
      reorderQty:   inv.product.reorder_qty,
      variance:     inv.quantity - inv.product.reorder_level,
      unitPrice:    Number(inv.product.unit_price || 0),
      estimatedRestockCost: inv.product.reorder_qty * Number(inv.product.unit_price || 0),
      warehouse:    inv.warehouse.name,
      warehouseId:  inv.warehouse.warehouse_id,
      stockStatus:  inv.quantity === 0 ? 'out_of_stock' : 'low_stock',
    }));

    // Category summary
    const catMap = {};
    lowItems.forEach(inv => {
      const cat = inv.product.category || 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalLowStock: total,
          outOfStock:    lowItems.filter(i => i.quantity === 0).length,
          criticalLow:   lowItems.filter(i => i.quantity > 0 && i.quantity <= Math.floor(i.product.reorder_level * 0.5)).length,
          avgVariance:   total > 0 ? lowItems.reduce((s, i) => s + (i.quantity - i.product.reorder_level), 0) / total : 0,
          categoryBreakdown: catMap,
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        items,
      },
    });
  });


  // ── GET /api/reports/supplier-performance ───────────────────────────────
  static getSupplierPerformance = asyncHandler(async (req, res) => {
    const { from, to, supplierId, status } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const where = {};
    if (supplierId) where.supplier_id = parseInt(supplierId);
    if (status)     where.status = status;
    if (from && to) where.order_date = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
    else if (from)  where.order_date = { [Op.gte]: new Date(from) };
    else if (to)    where.order_date = { [Op.lte]: new Date(to + 'T23:59:59') };

    const pos = await PurchaseOrder.findAll({
      where,
      include: [
        {
          model: Supplier, as: 'supplier',
          attributes: ['supplier_id', 'name', 'lead_time', 'rating', 'payment_terms', 'status'],
        },
      ],
    });

    // Aggregate per supplier
    const stats = {};
    pos.forEach(po => {
      const sid = po.supplier_id;
      if (!stats[sid]) {
        stats[sid] = {
          supplierId:      sid,
          name:            po.supplier?.name || 'Unknown',
          rating:          Number(po.supplier?.rating || 0),
          leadTime:        po.supplier?.lead_time || null,
          paymentTerms:    po.supplier?.payment_terms || null,
          supplierStatus:  po.supplier?.status || 'active',
          totalOrders:     0,
          totalSpent:      0,
          completedOrders: 0,
          cancelledOrders: 0,
          draftOrders:     0,
          pendingOrders:   0,
          autoDraftedOrders: 0,
          itemsOrdered:    0,
        };
      }
      const s = stats[sid];
      s.totalOrders  += 1;
      s.totalSpent   += Number(po.total_amount || 0);
      if (['received', 'completed'].includes(po.status)) s.completedOrders += 1;
      if (po.status === 'cancelled')                     s.cancelledOrders += 1;
      if (po.status === 'draft')                         s.draftOrders     += 1;
      if (['pending', 'submitted', 'approved'].includes(po.status)) s.pendingOrders += 1;
      if (po.auto_drafted)                               s.autoDraftedOrders += 1;
      // Parse items JSON if available
      try {
        const parsedItems = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
        s.itemsOrdered += parsedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      } catch (_) {}
    });

    const allSupplierData = Object.values(stats).map(s => ({
      ...s,
      fulfillmentRate: s.totalOrders > 0 ? ((s.completedOrders / s.totalOrders) * 100).toFixed(1) : '0.0',
      cancellationRate: s.totalOrders > 0 ? ((s.cancelledOrders / s.totalOrders) * 100).toFixed(1) : '0.0',
      avgOrderValue: s.totalOrders > 0 ? (s.totalSpent / s.totalOrders).toFixed(2) : '0.00',
    }));

    // Sort by totalSpent desc
    allSupplierData.sort((a, b) => b.totalSpent - a.totalSpent);

    const total    = allSupplierData.length;
    const paginated = allSupplierData.slice(offset, offset + limit);

    // Fetch suppliers that have no POs (with status=active)
    const supplierIds = allSupplierData.map(s => s.supplierId);
    const suppliersWithoutOrders = await Supplier.findAll({
      where: {
        supplier_id: { [Op.notIn]: supplierIds.length ? supplierIds : [0] },
        status: 'active',
      },
      attributes: ['supplier_id', 'name', 'rating', 'lead_time', 'payment_terms', 'status'],
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalSuppliers:       total + suppliersWithoutOrders.length,
          activeSuppliers:      allSupplierData.filter(s => s.supplierStatus === 'active').length,
          totalSpent:           allSupplierData.reduce((s, d) => s + d.totalSpent, 0),
          totalOrders:          pos.length,
          avgFulfillmentRate:   total > 0
            ? (allSupplierData.reduce((s, d) => s + parseFloat(d.fulfillmentRate), 0) / total).toFixed(1)
            : '0.0',
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        items: paginated,
        suppliersWithoutOrders: suppliersWithoutOrders.map(s => ({
          supplierId: s.supplier_id, name: s.name, rating: Number(s.rating), leadTime: s.lead_time,
        })),
      },
    });
  });


  // ── GET /api/reports/sales ───────────────────────────────────────────────
  static getSalesReport = asyncHandler(async (req, res) => {
    const { warehouseId, from, to, status, search } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const whScope = await warehouseScope(req, warehouseId);
    const where = {};
    if (whScope) where.warehouse_id = whScope;
    if (status)  where.status = status;
    if (search)  where.customer_name = { [Op.like]: `%${search}%` };

    if (from && to) where.order_date = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
    else if (from)  where.order_date = { [Op.gte]: new Date(from) };
    else if (to)    where.order_date = { [Op.lte]: new Date(to + 'T23:59:59') };

    const { count, rows } = await SalesOrder.findAndCountAll({
      where,
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'name'] },
        { model: User,      as: 'created_by_user', attributes: ['id', 'first_name', 'last_name', 'full_name'] },
      ],
      order: [['order_date', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    // Full dataset for aggregations (no pagination)
    const allOrders = await SalesOrder.findAll({
      where,
      attributes: ['order_date', 'total_amount', 'status', 'items'],
    });

    // Monthly aggregation
    const monthlyMap = {};
    allOrders.forEach(o => {
      const d = new Date(o.order_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, totalRevenue: 0, orderCount: 0, deliveredCount: 0 };
      monthlyMap[key].totalRevenue += Number(o.total_amount || 0);
      monthlyMap[key].orderCount   += 1;
      if (o.status === 'delivered') monthlyMap[key].deliveredCount += 1;
    });

    // Status breakdown
    const statusBreakdown = allOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    // Top items sold
    const productSales = {};
    allOrders.forEach(o => {
      try {
        const parsed = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
        parsed.forEach(item => {
          const key = item.product_id || item.sku || item.name;
          if (!key) return;
          if (!productSales[key]) productSales[key] = { name: item.product_name || item.name || key, qtySold: 0, revenue: 0 };
          productSales[key].qtySold  += item.quantity || 0;
          productSales[key].revenue  += (item.quantity || 0) * Number(item.unit_price || 0);
        });
      } catch (_) {}
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

    const items = rows.map(o => ({
      orderId:      o.order_id,
      orderNumber:  o.order_number,
      customerName: o.customer_name,
      orderDate:    o.order_date,
      deliveryDate: o.delivery_date || null,
      status:       o.status,
      totalAmount:  Number(o.total_amount || 0),
      itemCount:    (() => { try { const p = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); return p.length; } catch (_) { return 0; } })(),
      warehouse:    o.warehouse?.name    || '-',
      warehouseId:  o.warehouse?.warehouse_id || null,
      createdBy:    getDisplayName(o.created_by_user),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders:     count,
          totalRevenue,
          deliveredOrders: allOrders.filter(o => o.status === 'delivered').length,
          cancelledOrders: allOrders.filter(o => o.status === 'cancelled').length,
          avgOrderValue:   count > 0 ? (totalRevenue / allOrders.length).toFixed(2) : '0.00',
          statusBreakdown,
        },
        monthlyAggregation: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
        topProducts,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
        items,
      },
    });
  });


  // ── GET /api/reports/purchase-orders ────────────────────────────────────
  static getPurchaseOrders = asyncHandler(async (req, res) => {
    const { supplierId, warehouseId, from, to, status, autoDrafted } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const where = {};
    if (status)     where.status      = status;
    if (supplierId) where.supplier_id = parseInt(supplierId);
    if (warehouseId && req.user.role === 'admin') where.warehouse_id = parseInt(warehouseId);
    if (autoDrafted !== undefined) where.auto_drafted = autoDrafted === 'true';

    if (from && to) where.order_date = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
    else if (from)  where.order_date = { [Op.gte]: new Date(from) };
    else if (to)    where.order_date = { [Op.lte]: new Date(to + 'T23:59:59') };

    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier',          attributes: ['supplier_id', 'name', 'lead_time', 'rating'] },
        { model: User,     as: 'created_by_user',   attributes: ['id', 'first_name', 'last_name', 'full_name'] },
        { model: Warehouse,as: 'warehouse',          attributes: ['warehouse_id', 'name'] },
      ],
      order: [['order_date', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const allPos = await PurchaseOrder.findAll({ where, attributes: ['total_amount', 'status', 'auto_drafted'] });
    const totalValue       = allPos.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const statusBreakdown  = allPos.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});

    const items = rows.map(po => ({
      poId:           po.po_id,
      poNumber:       po.po_number,
      supplier:       po.supplier?.name       || '-',
      supplierId:     po.supplier?.supplier_id || null,
      leadTime:       po.supplier?.lead_time   || null,
      supplierRating: Number(po.supplier?.rating || 0),
      warehouse:      po.warehouse?.name       || '-',
      status:         po.status,
      totalAmount:    Number(po.total_amount || 0),
      autoDrafted:    po.auto_drafted || false,
      itemCount: (() => { try { const p = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []); return p.length; } catch (_) { return 0; } })(),
      orderDate:      po.order_date,
      expectedDelivery: po.expected_delivery || null,
      createdBy:      getDisplayName(po.created_by_user),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders: count,
          totalValue,
          statusBreakdown,
          autoDraftedCount: allPos.filter(p => p.auto_drafted).length,
        },
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
        items,
      },
    });
  });


  // ── GET /api/reports/request-fulfillment ────────────────────────────────
  static getRequestFulfillment = asyncHandler(async (req, res) => {
    const { from, to, status, requesterId, warehouseId } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const where = {};
    if (status)      where.status       = status;
    if (requesterId) where.requester_id = parseInt(requesterId);
    if (warehouseId && req.user.role === 'admin') where.warehouse_id = parseInt(warehouseId);

    if (from && to) where.created_at = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
    else if (from)  where.created_at = { [Op.gte]: new Date(from) };
    else if (to)    where.created_at = { [Op.lte]: new Date(to + 'T23:59:59') };

    // Managers only see requests for their warehouses
    if (req.user.role === 'manager') {
      const managed = await Warehouse.findAll({ where: { manager_id: req.user.id }, attributes: ['warehouse_id'] });
      const ids = managed.map(w => w.warehouse_id);
      where.warehouse_id = ids.length ? { [Op.in]: ids } : { [Op.in]: [-1] };
    }

    const { count, rows } = await Request.findAndCountAll({
      where,
      include: [
        { model: User,        as: 'requester', attributes: ['id', 'first_name', 'last_name', 'full_name'] },
        { model: RequestItem, as: 'items',     attributes: ['id', 'requested_qty', 'approved_qty', 'fulfilled_qty'] },
        { model: Warehouse,   as: 'warehouse', attributes: ['warehouse_id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const allReqs = await Request.findAll({ where, attributes: ['status', 'priority'] });
    const statusBreakdown   = allReqs.reduce((acc, r) => { acc[r.status]   = (acc[r.status]   || 0) + 1; return acc; }, {});
    const priorityBreakdown = allReqs.reduce((acc, r) => { acc[r.priority] = (acc[r.priority] || 0) + 1; return acc; }, {});

    const items = rows.map(r => {
      const reqQty = (r.items || []).reduce((s, i) => s + (i.requested_qty || 0), 0);
      const appQty = (r.items || []).reduce((s, i) => s + (i.approved_qty  || 0), 0);
      const fulQty = (r.items || []).reduce((s, i) => s + (i.fulfilled_qty || 0), 0);
      return {
        requestId:      r.id,
        requestNumber:  r.request_number,
        requester:      getDisplayName(r.requester, '-'),
        requesterId:    r.requester?.id,
        warehouse:      r.warehouse?.name || '-',
        itemCount:      (r.items || []).length,
        totalRequested: reqQty,
        totalApproved:  appQty,
        totalFulfilled: fulQty,
        fulfillmentRate: reqQty > 0 ? ((fulQty / reqQty) * 100).toFixed(1) : '0.0',
        status:         r.status,
        priority:       r.priority,
        createdAt:      r.created_at,
        approvedAt:     r.approved_at  || null,
        fulfilledAt:    r.fulfilled_at || null,
        rejectedAt:     r.rejected_at  || null,
        rejectionReason: r.rejection_reason || null,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests: count,
          statusBreakdown,
          priorityBreakdown,
          overallFulfillmentRate: (() => {
            const reqTot = items.reduce((s, i) => s + i.totalRequested, 0);
            const fulTot = items.reduce((s, i) => s + i.totalFulfilled, 0);
            return reqTot > 0 ? ((fulTot / reqTot) * 100).toFixed(1) : '0.0';
          })(),
        },
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
        items,
      },
    });
  });


  // ── GET /api/reports/summary ────────────────────────────────────────────
  // Live, no-cache queries every call. Used by the Reports page KPI strip.
  // Returns: totalProducts, totalStockValue, lowStockCount, outOfStockCount,
  //          draftSubmittedOrdersCount, topLowStockItems (all fresh, no caching)
  static getSummary = asyncHandler(async (req, res) => {
    const [
      totalProducts,
      lowStockRows,
      outOfStockRows,
      stockValueRows,
      draftSubmittedOrdersCount,
      topLowStockRaw,
    ] = await Promise.all([

      // Total active products count
      Product.count(),

      // Low stock: aggregate quantity across all warehouses per product, then check <= reorder_level
      sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM (
           SELECT i.product_id
           FROM inventory i
           JOIN products p ON i.product_id = p.product_id
           GROUP BY i.product_id, p.reorder_level
           HAVING SUM(i.quantity) > 0 AND SUM(i.quantity) <= p.reorder_level
         ) AS low
         WHERE 1=1`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // Out of stock: aggregate quantity across all warehouses per product, then check if total = 0
      sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM (
           SELECT i.product_id
           FROM inventory i
           JOIN products p ON i.product_id = p.product_id
           GROUP BY i.product_id
           HAVING SUM(i.quantity) = 0
         ) AS oos
         WHERE 1=1`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // Total stock value: live SUM(quantity * unit_price)
      sequelize.query(
        `SELECT COALESCE(SUM(i.quantity * p.unit_price), 0) AS total_value
         FROM inventory i
         JOIN products p ON i.product_id = p.product_id`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // Draft or submitted purchase orders
      PurchaseOrder.count({ where: { status: { [Op.in]: ['draft', 'submitted'] } } }),

      // Top 10 low stock products: live, ordered by how far below reorder_level
      sequelize.query(
        `SELECT p.product_id, p.name, p.sku, p.reorder_level, p.reorder_qty,
                COALESCE(SUM(i.quantity), 0) AS current_qty,
                (COALESCE(SUM(i.quantity), 0) - p.reorder_level) AS variance
         FROM products p
         LEFT JOIN inventory i ON p.product_id = i.product_id
         WHERE p.is_active = 1
         GROUP BY p.product_id, p.name, p.sku, p.reorder_level, p.reorder_qty
         HAVING COALESCE(SUM(i.quantity), 0) <= p.reorder_level
         ORDER BY variance ASC
         LIMIT 10`,
        { type: sequelize.QueryTypes.SELECT },
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalStockValue: Number(stockValueRows[0]?.total_value || 0),
        lowStockCount:   Number(lowStockRows[0]?.cnt   || 0),
        outOfStockCount: Number(outOfStockRows[0]?.cnt || 0),
        draftSubmittedOrdersCount,
        topLowStockItems: topLowStockRaw.map(r => ({
          productId:    r.product_id,
          name:         r.name,
          sku:          r.sku,
          reorderLevel: Number(r.reorder_level),
          reorderQty:   Number(r.reorder_qty),
          currentQty:   Number(r.current_qty),
          variance:     Number(r.variance),
          stockStatus:  Number(r.current_qty) === 0 ? 'out_of_stock' : 'low_stock',
        })),
      },
    });
  });

  // ── GET /api/reports/audit-log ───────────────────────────────────────────
  static getAuditLog = asyncHandler(async (req, res) => {
    const { userId, action, from, to } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const where = {};
    if (action) where.action  = action;
    if (userId) where.user_id = parseInt(userId);

    if (from && to) where.timestamp = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
    else if (from)  where.timestamp = { [Op.gte]: new Date(from) };
    else if (to)    where.timestamp = { [Op.lte]: new Date(to + 'T23:59:59') };

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'full_name', 'role', 'email'] }],
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const allLogs = await AuditLog.findAll({ where, attributes: ['action', 'user_id'] });
    const actionBreakdown = allLogs.reduce((acc, l) => { acc[l.action] = (acc[l.action] || 0) + 1; return acc; }, {});

    const items = rows.map(l => ({
      logId:     l.log_id,
      timestamp: l.timestamp,
      user:      getDisplayName(l.user, 'System'),
      email:     l.user?.email      || '-',
      role:      l.user?.role       || '-',
      action:    l.action,
      entity:    l.table_name,
      changes:   l.changes,
      ipAddress: l.ip_address || null,
    }));

    res.json({
      success: true,
      data: {
        summary: { totalLogs: count, uniqueUsers: new Set(allLogs.map(l => l.user_id)).size, actionBreakdown },
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
        items,
      },
    });
  });


  // ── GET /api/reports/export/:type ───────────────────────────────────────
  static exportReport = asyncHandler(async (req, res) => {
    const { type }         = req.params;
    const { format = 'csv', from, to, warehouseId, supplierId, status } = req.query;

    const dateRange = from && to ? { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] } : undefined;

    let reportData = [];
    let filename   = '';

    switch (type) {
    case 'inventory': {
      const rows = await Inventory.findAll({
        include: [
          { model: Product,   as: 'product',   attributes: ['sku', 'name', 'category', 'unit_price', 'cost_price', 'reorder_level'] },
          { model: Warehouse, as: 'warehouse', attributes: ['name'] },
        ],
      });
      reportData = rows.map(r => ({
        SKU:          r.product.sku,
        Product:      r.product.name,
        Category:     r.product.category,
        Quantity:     r.quantity,
        ReservedQty:  r.reserved_qty,
        UnitPrice:    r.product.unit_price,
        CostPrice:    r.product.cost_price,
        TotalValue:   (r.quantity || 0) * Number(r.product.unit_price || 0),
        TotalCost:    (r.quantity || 0) * Number(r.product.cost_price || r.product.unit_price || 0),
        ReorderLevel: r.product.reorder_level,
        Warehouse:    r.warehouse.name,
        BatchNo:      r.batch_no   || '',
        ExpiryDate:   r.expiry_date || '',
        Location:     r.location   || '',
      }));
      filename = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }

    case 'sales': {
      const sWhere = {};
      if (dateRange) sWhere.order_date = dateRange;
      if (status)    sWhere.status = status;
      if (warehouseId) sWhere.warehouse_id = parseInt(warehouseId);
      const orders = await SalesOrder.findAll({
        where: sWhere,
        include: [{ model: Warehouse, as: 'warehouse', attributes: ['name'] }],
        order: [['order_date', 'DESC']],
      });
      reportData = orders.map(o => ({
        OrderNumber:  o.order_number,
        CustomerName: o.customer_name,
        OrderDate:    o.order_date,
        DeliveryDate: o.delivery_date || '',
        Status:       o.status,
        TotalAmount:  o.total_amount,
        Warehouse:    o.warehouse?.name || '',
      }));
      filename = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }

    case 'purchase-orders': {
      const poWhere = {};
      if (dateRange) poWhere.order_date = dateRange;
      if (status)    poWhere.status = status;
      if (supplierId) poWhere.supplier_id = parseInt(supplierId);
      const pos = await PurchaseOrder.findAll({
        where: poWhere,
        include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }],
        order: [['order_date', 'DESC']],
      });
      reportData = pos.map(po => ({
        PONumber:    po.po_number,
        Supplier:    po.supplier?.name || '',
        Status:      po.status,
        TotalAmount: po.total_amount,
        OrderDate:   po.order_date,
        ExpectedDelivery: po.expected_delivery || '',
        AutoDrafted: po.auto_drafted ? 'Yes' : 'No',
      }));
      filename = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }

    case 'supplier-performance': {
      const spWhere = {};
      if (dateRange) spWhere.order_date = dateRange;
      const pos2 = await PurchaseOrder.findAll({
        where: spWhere,
        include: [{ model: Supplier, as: 'supplier', attributes: ['name', 'lead_time', 'rating'] }],
      });
      const stats = {};
      pos2.forEach(po => {
        const sid = po.supplier_id;
        if (!stats[sid]) stats[sid] = { Supplier: po.supplier?.name || '', LeadTimeDays: po.supplier?.lead_time || '', Rating: po.supplier?.rating || '', TotalOrders: 0, TotalSpent: 0, CompletedOrders: 0 };
        stats[sid].TotalOrders  += 1;
        stats[sid].TotalSpent   += Number(po.total_amount || 0);
        if (['received', 'completed'].includes(po.status)) stats[sid].CompletedOrders += 1;
      });
      reportData = Object.values(stats).map(s => ({
        ...s,
        FulfillmentRate: s.TotalOrders > 0 ? ((s.CompletedOrders / s.TotalOrders) * 100).toFixed(1) + '%' : '0.0%',
      }));
      filename = `supplier-performance-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }

    case 'stock-movement': {
      const smWhere = {};
      if (dateRange) smWhere.timestamp = dateRange;
      
      const { action } = req.query;
      if (action) {
        smWhere.action = action;
      } else {
        smWhere.action = {
          [Op.in]: ['create', 'update', 'BARCODE_SCAN', 'RECEIVE_PURCHASE_ORDER', 'REQUEST_FULFILLED'],
        };
      }

      if (req.user.role !== 'admin') {
        smWhere.user_id = req.user.id;
      }

      const logs = await AuditLog.findAll({
        where: smWhere,
        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'full_name', 'role'] }],
        order: [['timestamp', 'DESC']],
        limit: 10000,
      });
      reportData = logs.map(l => {
        const changes = l.changes || {};
        return {
          Timestamp:      l.timestamp,
          User:           l.user ? `${l.user.first_name || ''} ${l.user.last_name || ''}`.trim() || 'System' : 'System',
          Action:         l.action,
          Entity:         l.table_name,
          QuantityChange: changes.quantity_change ?? changes.quantity ?? '',
          Reference:      changes.reference_id || changes.po_number || changes.request_number || '',
          IPAddress:      l.ip_address || '',
        };
      });
      filename = `stock-movement-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }

    case 'audit-log': {
      const alWhere = {};
      if (dateRange) alWhere.timestamp = dateRange;
      const logs = await AuditLog.findAll({
        where: alWhere,
        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'full_name', 'role'] }],
        order: [['timestamp', 'DESC']],
        limit: 10000,
      });
      reportData = logs.map(l => ({
        Timestamp: l.timestamp,
        User:      l.user ? `${l.user.first_name || ''} ${l.user.last_name || ''}`.trim() || '' : '',
        Role:      l.user?.role      || '',
        Action:    l.action,
        Entity:    l.table_name,
        IPAddress: l.ip_address || '',
      }));
      filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }

    default:
      return res.status(400).json({ success: false, error: `Invalid report type: ${type}` });
    }

    if (format === 'csv') {
      if (reportData.length === 0) {
        return res.status(200).send('No data found for the selected filters.');
      }
      const parser = new Parser();
      const csv    = parser.parse(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    if (format === 'json') {
      return res.json({ success: true, data: reportData, filename });
    }

    return res.status(400).json({ success: false, error: 'Supported formats: csv, json' });
  });
}

export default ReportController;
