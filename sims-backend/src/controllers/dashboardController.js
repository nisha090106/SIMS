import { Op } from 'sequelize';
import {
  sequelize,
  Product,
  Inventory,
  Warehouse,
  Supplier,
  PurchaseOrder,
  AuditLog,
  UserRequest,
  User,
} from '../models/index.js';
import logger from '../config/logger.js';

/* ─────────────────────────────────────────────────────────────────
   Helper: resolve warehouse scope for manager / staff
   Manager → all warehouses they manage (manager_id = user.id)
   Staff   → same as manager (same warehouse they work in)
   Admin   → no filter (all warehouses)
   Requester → no warehouse access to admin data
──────────────────────────────────────────────────────────────────── */
async function getManagedWarehouseIds(userId, role) {
  if (role === 'admin') return null; // null = no filter = all

  if (role === 'staff') {
    const user = await User.findByPk(userId, { attributes: ['warehouse_id'] });
    return user?.warehouse_id ? [user.warehouse_id] : [-1];
  }

  // Manager: warehouses where manager_id = their user id
  const warehouses = await Warehouse.findAll({
    where: { manager_id: userId },
    attributes: ['warehouse_id'],
  });
  // Fallback: if no warehouse assigned, include ALL (so they see something)
  if (warehouses.length === 0) return null;
  return warehouses.map((w) => w.warehouse_id);
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/dashboard/stats
──────────────────────────────────────────────────────────────────── */
export async function getDashboardStats(req, res, next) {
  try {
    const { role, user_id, id } = req.user;
    const userId = user_id || id;

    /* ── Requester: return only their own request counts ── */
    if (role === 'user') {
      const [pending, approved, fulfilled] = await Promise.all([
        UserRequest.count({ where: { requested_by: userId, status: 'pending' } }),
        UserRequest.count({ where: { requested_by: userId, status: 'approved' } }),
        UserRequest.count({ where: { requested_by: userId, status: 'fulfilled' } }),
      ]);

      const recentRequests = await UserRequest.findAll({
        where: { requested_by: userId },
        order: [['created_at', 'DESC']],
        limit: 5,
        attributes: ['id', 'request_number', 'status', 'purpose', 'created_at'],
      });

      return res.json({
        success: true,
        role,
        stats: { pending, approved, fulfilled },
        recentRequests,
      });
    }

    /* ── Admin / Manager / Staff ── */
    const warehouseIds = await getManagedWarehouseIds(userId, role);
    const whClause = warehouseIds ? { warehouse_id: { [Op.in]: warehouseIds } } : {};
    const whParam  = warehouseIds ? warehouseIds.join(',') : null;

    // Build a reusable WHERE fragment for raw SQL
    const whSQL = whParam
      ? `AND i.warehouse_id IN (${whParam})`
      : '';

    // ── KPI queries (parallel) ──────────────────────────────────
    const [
      totalProducts,
      totalWarehouses,
      totalSuppliers,
      stockValueResult,
      lowStockResult,
      outOfStockResult,
      pendingPOs,
      openRequests,
    ] = await Promise.all([
      // Total products (always global — products aren't warehouse-scoped)
      Product.count(),

      // Total warehouses in scope
      warehouseIds
        ? Warehouse.count({ where: { warehouse_id: { [Op.in]: warehouseIds } } })
        : Warehouse.count(),

      // Total active suppliers (always global)
      Supplier.count({ where: { status: 'active' } }),

      // Stock value
      sequelize.query(
        `SELECT COALESCE(SUM(i.quantity * p.unit_price), 0) AS total_value
         FROM inventory i
         JOIN products p ON i.product_id = p.product_id
         WHERE 1=1 ${whSQL}`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // Low stock count (products where total qty across all warehouses <= reorder_level)
      sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM (
           SELECT i.product_id
           FROM inventory i
           JOIN products p ON i.product_id = p.product_id
           ${whSQL}
           GROUP BY i.product_id, p.reorder_level
           HAVING SUM(i.quantity) > 0 AND SUM(i.quantity) <= p.reorder_level
         ) AS low
         WHERE 1=1`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // Out of stock count (products where total qty = 0)
      sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM (
           SELECT i.product_id
           FROM inventory i
           JOIN products p ON i.product_id = p.product_id
           ${whSQL}
           GROUP BY i.product_id
           HAVING SUM(i.quantity) = 0
         ) AS oos
         WHERE 1=1`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // Pending purchase orders
      PurchaseOrder.count({ where: { status: 'pending' } }),

      // Open user requests (pending + approved)
      UserRequest.count({ where: { status: { [Op.in]: ['pending', 'approved'] } } }),
    ]);

    // ── Recent activity (last 10 audit logs, scoped by role) ────
    const auditWhere = {};
    if (role !== 'admin') {
      // Staff / manager only see their own actions
      auditWhere.user_id = userId;
    }

    const recentLogs = await AuditLog.findAll({
      where: auditWhere,
      order: [['timestamp', 'DESC']],
      limit: 10,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email'],
      }],
    });

    const recentActivity = recentLogs.map((log) => {
      const u = log.user;
      const name = u
        ? u.full_name || u.email
        : 'System';
      return {
        action:     log.action,
        tableName:  log.table_name,
        user:       name,
        userId:     log.user_id,
        timestamp:  log.timestamp,
        changes:    log.changes,
      };
    });

    // ── Warehouse breakdown (for KPI detail) ───────────────────
    const warehouseBreakdown = await sequelize.query(
      `SELECT
         w.warehouse_id,
         w.name AS warehouse_name,
         COALESCE(SUM(i.quantity), 0) AS total_qty,
         COALESCE(SUM(i.quantity * p.unit_price), 0) AS stock_value,
         COUNT(DISTINCT i.product_id) AS unique_products
       FROM warehouses w
       LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
       LEFT JOIN products p  ON i.product_id   = p.product_id
       ${warehouseIds ? `WHERE w.warehouse_id IN (${whParam})` : ''}
       GROUP BY w.warehouse_id, w.name
       ORDER BY stock_value DESC`,
      { type: sequelize.QueryTypes.SELECT },
    );

    return res.json({
      success: true,
      role,
      stats: {
        totalProducts:          Number(totalProducts),
        totalWarehouses:        Number(totalWarehouses),
        totalStockValue:        Number(stockValueResult[0]?.total_value || 0),
        lowStockCount:          Number(lowStockResult[0]?.cnt || 0),
        outOfStockCount:        Number(outOfStockResult[0]?.cnt || 0),
        pendingPurchaseOrders:  Number(pendingPOs),
        openRequests:           Number(openRequests),
        totalSuppliers:         Number(totalSuppliers),
      },
      recentActivity,
      warehouseBreakdown: warehouseBreakdown.map((r) => ({
        warehouseId:    r.warehouse_id,
        warehouseName:  r.warehouse_name,
        totalQty:       Number(r.total_qty),
        stockValue:     Number(r.stock_value),
        uniqueProducts: Number(r.unique_products),
      })),
    });
  } catch (err) {
    logger.error(`getDashboardStats error: ${err.message}`);
    next(err);
  }
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/dashboard/charts
──────────────────────────────────────────────────────────────────── */
export async function getDashboardCharts(req, res, next) {
  try {
    const { role, user_id, id } = req.user;
    const userId = user_id || id;

    /* Requester: only their own request status breakdown */
    if (role === 'user') {
      const breakdown = await sequelize.query(
        `SELECT status, COUNT(*) AS cnt
         FROM user_requests
         WHERE requested_by = :userId
         GROUP BY status`,
        {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT,
        },
      );
      return res.json({
        success: true,
        role,
        requestStatusBreakdown: breakdown.map((r) => ({
          status: r.status,
          count:  Number(r.cnt),
        })),
      });
    }

    /* Admin / Manager / Staff */
    const warehouseIds = await getManagedWarehouseIds(userId, role);
    const whParam = warehouseIds ? warehouseIds.join(',') : null;
    const whSQL   = whParam ? `AND i.warehouse_id IN (${whParam})` : '';
    const whWhere = whParam
      ? `WHERE w.warehouse_id IN (${whParam})`
      : '';

    const [
      stockByWarehouse,
      topLowStock,
      poTrend,
      requestBreakdown,
    ] = await Promise.all([

      // 1. Stock value + item count per warehouse
      sequelize.query(
        `SELECT
           w.name AS warehouse_name,
           COALESCE(SUM(i.quantity * p.unit_price), 0) AS stock_value,
           COALESCE(SUM(i.quantity), 0) AS item_count
         FROM warehouses w
         LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
         LEFT JOIN products p  ON i.product_id   = p.product_id
         ${whWhere}
         GROUP BY w.warehouse_id, w.name
         ORDER BY stock_value DESC`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // 2. Top 5 low-stock items
      sequelize.query(
        `SELECT
           p.name        AS product_name,
           p.sku,
           p.reorder_level,
           COALESCE(SUM(i.quantity), 0) AS current_qty
         FROM products p
         JOIN inventory i ON p.product_id = i.product_id
         WHERE i.quantity <= p.reorder_level ${whSQL}
         GROUP BY p.product_id, p.name, p.sku, p.reorder_level
         ORDER BY (COALESCE(SUM(i.quantity), 0) / NULLIF(p.reorder_level, 0)) ASC
         LIMIT 5`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // 3. Purchase order count — last 7 days
      sequelize.query(
        `SELECT
           DATE(created_at) AS date,
           COUNT(*)         AS cnt
         FROM purchase_orders
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        { type: sequelize.QueryTypes.SELECT },
      ),

      // 4. Request status breakdown (all requests for admin, else own)
      role === 'admin'
        ? sequelize.query(
          'SELECT status, COUNT(*) AS cnt FROM user_requests GROUP BY status',
          { type: sequelize.QueryTypes.SELECT },
        )
        : sequelize.query(
          'SELECT status, COUNT(*) AS cnt FROM user_requests WHERE requested_by = :userId GROUP BY status',
          { replacements: { userId }, type: sequelize.QueryTypes.SELECT },
        ),
    ]);

    // Fill in missing days for PO trend (so chart always shows 7 bars)
    const trend = buildDayTrend(poTrend, 7);

    return res.json({
      success: true,
      role,
      stockByWarehouse: stockByWarehouse.map((r) => ({
        warehouseName: r.warehouse_name,
        stockValue:    Number(r.stock_value),
        itemCount:     Number(r.item_count),
      })),
      topLowStockItems: topLowStock.map((r) => ({
        productName:  r.product_name,
        sku:          r.sku,
        currentQty:   Number(r.current_qty),
        reorderLevel: Number(r.reorder_level),
      })),
      purchaseOrderTrend: trend,
      requestStatusBreakdown: requestBreakdown.map((r) => ({
        status: r.status,
        count:  Number(r.cnt),
      })),
    });
  } catch (err) {
    logger.error(`getDashboardCharts error: ${err.message}`);
    next(err);
  }
}

/* ─────────────────────────────────────────────────────────────────
   Helper: fill last N days with 0 where no PO was created
──────────────────────────────────────────────────────────────────── */
function buildDayTrend(rows, days) {
  const map = {};
  rows.forEach((r) => {
    const key = r.date instanceof Date
      ? r.date.toISOString().split('T')[0]
      : String(r.date).split('T')[0];
    map[key] = Number(r.cnt);
  });

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push({
      date:  key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: map[key] || 0,
    });
  }
  return result;
}
