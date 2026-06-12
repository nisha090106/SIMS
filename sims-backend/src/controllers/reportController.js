import { Op, sequelize } from 'sequelize';
import { Product, Inventory, Warehouse, PurchaseOrder, AuditLog, User, Request, RequestItem, Supplier } from '../models/index.js';
import asyncHandler from 'express-async-handler';
import logger from '../config/logger.js';
import { Parser } from 'json2csv';

class ReportController {
  // Get dashboard stats (existing functionality)
  static getDashboardStats = asyncHandler(async (req, res, next) => {
    const totalProducts = await Product.count();

    const stockValueResult = await sequelize.query(
      `SELECT SUM(i.quantity * p.unit_price) as total_value
       FROM inventory i
       JOIN products p ON i.product_id = p.product_id`,
      { type: sequelize.QueryTypes.SELECT },
    );
    const totalStockValue = Number(stockValueResult[0]?.total_value || 0);

    const lowStockResult = await sequelize.query(
      `SELECT COUNT(DISTINCT i.product_id) as count
       FROM inventory i
       JOIN products p ON i.product_id = p.product_id
       WHERE i.quantity <= p.reorder_level`,
      { type: sequelize.QueryTypes.SELECT },
    );
    const lowStockCount = Number(lowStockResult[0]?.count || 0);

    const pendingOrdersCount = await PurchaseOrder.count({
      where: { status: 'pending' },
    });

    const warehouseStockResult = await sequelize.query(
      `SELECT w.name as warehouse, COALESCE(SUM(i.quantity), 0) as totalStock
       FROM warehouses w
       LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
       GROUP BY w.warehouse_id, w.name`,
      { type: sequelize.QueryTypes.SELECT },
    );
    const warehouseStockData = warehouseStockResult.map(row => ({
      warehouse: row.warehouse,
      totalStock: Number(row.totalStock || 0),
    }));

    const categoryDistributionResult = await sequelize.query(
      `SELECT category, COUNT(*) as count
       FROM products
       GROUP BY category`,
      { type: sequelize.QueryTypes.SELECT },
    );
    const categoryDistribution = categoryDistributionResult.map(row => ({
      category: row.category,
      count: Number(row.count || 0),
    }));

    const recentLogs = await AuditLog.findAll({
      limit: 5,
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['first_name', 'last_name', 'email'],
        },
      ],
    });
    const recentActivity = recentLogs.map(log => ({
      action: log.action,
      user: `${log.user?.first_name || ''} ${log.user?.last_name || ''}`,
      timestamp: log.timestamp,
    }));

    res.json({
      success: true,
      data: {
        totalProducts,
        totalStockValue,
        lowStockCount,
        pendingOrdersCount,
        warehouseStockData,
        categoryDistribution,
        recentActivity,
      },
    });
  });

  // GET /api/reports/inventory-valuation
  static getInventoryValuation = asyncHandler(async (req, res, next) => {
    const { warehouseId, categoryId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereClause = {};

    // Warehouse isolation
    if (userRole === 'manager') {
      const userWarehouses = await Warehouse.findAll({
        where: { manager_id: userId },
        attributes: ['warehouse_id'],
      });
      const warehouseIds = userWarehouses.map(w => w.warehouse_id);
      whereClause.warehouse_id = { [Op.in]: warehouseIds };
    } else if (userRole === 'admin' && warehouseId) {
      whereClause.warehouse_id = parseInt(warehouseId);
    }

    const inventory = await Inventory.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          attributes: ['product_id', 'sku', 'name', 'category', 'unit_price'],
        },
        {
          model: Warehouse,
          attributes: ['warehouse_id', 'name'],
        },
      ],
    });

    // Filter by category if provided
    let filteredInventory = inventory;
    if (categoryId) {
      filteredInventory = inventory.filter(item => item.product.category === categoryId);
    }

    const summary = {
      totalSkus: new Set(filteredInventory.map(item => item.product.sku)).size,
      totalUnits: filteredInventory.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: filteredInventory.reduce((sum, item) => sum + (item.stock_value || 0), 0),
    };

    const categoryValues = {};
    filteredInventory.forEach(item => {
      const category = item.product.category || 'Uncategorized';
      categoryValues[category] = (categoryValues[category] || 0) + (item.stock_value || 0);
    });

    const data = filteredInventory.map(item => ({
      sku: item.product.sku,
      name: item.product.name,
      category: item.product.category,
      quantity: item.quantity,
      unitCost: item.product.unit_price,
      totalValue: item.stock_value,
      warehouse: item.warehouse.name,
    }));

    res.json({
      success: true,
      data: {
        summary,
        categoryValues,
        items: data,
      },
    });
  });

  // GET /api/reports/stock-movement
  static getStockMovement = asyncHandler(async (req, res, next) => {
    const { warehouseId, productId, from, to } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereClause = {
      action: { [Op.in]: ['barcode_scan', 'stock_adjust', 'stock_transfer', 'RECEIVE'] },
    };

    if (from && to) {
      whereClause.timestamp = {
        [Op.between]: [new Date(from), new Date(to)],
      };
    }

    if (userRole === 'manager') {
      const userWarehouses = await Warehouse.findAll({
        where: { manager_id: userId },
        attributes: ['warehouse_id'],
      });
      const warehouseIds = userWarehouses.map(w => w.warehouse_id);
      whereClause.warehouse_id = { [Op.in]: warehouseIds };
    } else if (userRole === 'admin' && warehouseId) {
      whereClause.warehouse_id = parseInt(warehouseId);
    }

    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [['timestamp', 'DESC']],
      limit: 500,
    });

    const data = logs.map(log => {
      const changes = log.changes || {};
      return {
        timestamp: log.timestamp,
        user: `${log.user.first_name} ${log.user.last_name}`,
        action: log.action,
        entity: log.table_name,
        quantity: changes.quantity_change || changes.quantity || 0,
        reference: changes.reference_id || '-',
        details: JSON.stringify(changes),
      };
    });

    res.json({
      success: true,
      data: {
        items: data,
        total: data.length,
      },
    });
  });

  // GET /api/reports/low-stock
  static getLowStock = asyncHandler(async (req, res, next) => {
    const { warehouseId, threshold } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereClause = { status: 'low_stock' };

    if (userRole === 'manager') {
      const userWarehouses = await Warehouse.findAll({
        where: { manager_id: userId },
        attributes: ['warehouse_id'],
      });
      const warehouseIds = userWarehouses.map(w => w.warehouse_id);
      whereClause.warehouse_id = { [Op.in]: warehouseIds };
    } else if (userRole === 'admin' && warehouseId) {
      whereClause.warehouse_id = parseInt(warehouseId);
    }

    const lowStock = await Inventory.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          attributes: ['product_id', 'sku', 'name', 'reorder_level', 'reorder_qty'],
        },
        {
          model: Warehouse,
          attributes: ['warehouse_id', 'name'],
        },
      ],
      order: [['quantity', 'ASC']],
    });

    const summary = {
      totalLowStock: lowStock.length,
      avgQuantity: lowStock.length > 0 ? lowStock.reduce((sum, item) => sum + item.quantity, 0) / lowStock.length : 0,
    };

    const data = lowStock.map(item => ({
      sku: item.product.sku,
      name: item.product.name,
      currentQty: item.quantity,
      reorderLevel: item.product.reorder_level,
      reorderQty: item.product.reorder_qty,
      warehouse: item.warehouse.name,
      variance: item.quantity - item.product.reorder_level,
    }));

    res.json({
      success: true,
      data: {
        summary,
        items: data,
      },
    });
  });

  // GET /api/reports/purchase-orders
  static getPurchaseOrders = asyncHandler(async (req, res, next) => {
    const { supplierId, warehouseId, from, to, status } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (supplierId) {
      whereClause.supplier_id = parseInt(supplierId);
    }

    if (from && to) {
      whereClause.created_at = {
        [Op.between]: [new Date(from), new Date(to)],
      };
    }

    const pos = await PurchaseOrder.findAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          attributes: ['supplier_id', 'name', 'lead_time'],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const summary = {
      totalPos: pos.length,
      totalValue: pos.reduce((sum, po) => sum + (po.total_amount || 0), 0),
      avgLeadTime: pos.length > 0 ? pos.reduce((sum, po) => sum + (po.supplier?.lead_time || 0), 0) / pos.length : 0,
    };

    const data = pos.map(po => ({
      poNumber: po.po_number,
      supplier: po.supplier.name,
      itemCount: Array.isArray(po.items) ? po.items.length : 0,
      totalAmount: po.total_amount,
      status: po.status,
      orderDate: po.created_at,
      receivedDate: po.updated_at,
      leadTime: po.supplier.lead_time,
      createdBy: `${po.creator.first_name} ${po.creator.last_name}`,
    }));

    res.json({
      success: true,
      data: {
        summary,
        items: data,
      },
    });
  });

  // GET /api/reports/request-fulfillment
  static getRequestFulfillment = asyncHandler(async (req, res, next) => {
    const { from, to, status, requesterId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereClause = {};

    if (from && to) {
      whereClause.created_at = {
        [Op.between]: [new Date(from), new Date(to)],
      };
    }

    if (status) {
      whereClause.status = status;
    }

    if (requesterId) {
      whereClause.requester_id = parseInt(requesterId);
    }

    const requests = await Request.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name'],
        },
        {
          model: RequestItem,
          attributes: ['id', 'requested_qty', 'approved_qty', 'fulfilled_qty'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const summary = {
      totalRequests: requests.length,
      fulfilled: requests.filter(r => r.status === 'fulfilled').length,
      pending: requests.filter(r => r.status === 'pending').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };

    const data = requests.map(req => ({
      requestNumber: req.request_number,
      requester: `${req.requester.first_name} ${req.requester.last_name}`,
      itemCount: req.items ? req.items.length : 0,
      totalRequested: req.items ? req.items.reduce((sum, item) => sum + item.requested_qty, 0) : 0,
      totalApproved: req.items ? req.items.reduce((sum, item) => sum + (item.approved_qty || 0), 0) : 0,
      totalFulfilled: req.items ? req.items.reduce((sum, item) => sum + (item.fulfilled_qty || 0), 0) : 0,
      status: req.status,
      priority: req.priority,
      createdAt: req.created_at,
      fulfilledAt: req.fulfilled_at,
    }));

    res.json({
      success: true,
      data: {
        summary,
        items: data,
      },
    });
  });

  // GET /api/reports/audit-log
  static getAuditLog = asyncHandler(async (req, res, next) => {
    const { userId, action, from, to, warehouseId } = req.query;
    const userRole = req.user.role;
    const currentUserId = req.user.id;

    let whereClause = {};

    if (action) {
      whereClause.action = action;
    }

    if (from && to) {
      whereClause.timestamp = {
        [Op.between]: [new Date(from), new Date(to)],
      };
    }

    if (userId) {
      whereClause.user_id = parseInt(userId);
    }

    // Managers can only see audit logs for their warehouse
    if (userRole === 'manager') {
      const userWarehouses = await Warehouse.findAll({
        where: { manager_id: currentUserId },
        attributes: ['warehouse_id'],
      });
      const warehouseIds = userWarehouses.map(w => w.warehouse_id);
      whereClause.warehouse_id = { [Op.in]: warehouseIds };
    } else if (userRole === 'admin' && warehouseId) {
      whereClause.warehouse_id = parseInt(warehouseId);
    }

    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name', 'role', 'email'],
        },
      ],
      order: [['timestamp', 'DESC']],
      limit: 1000,
    });

    const summary = {
      totalLogs: logs.length,
      uniqueUsers: new Set(logs.map(log => log.user_id)).size,
      actionBreakdown: logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
    };

    const data = logs.map(log => ({
      timestamp: log.timestamp,
      user: `${log.user.first_name} ${log.user.last_name}`,
      email: log.user.email,
      role: log.user.role,
      action: log.action,
      entity: log.table_name,
      changes: log.changes,
      ipAddress: log.ip_address || '-',
    }));

    res.json({
      success: true,
      data: {
        summary,
        items: data,
      },
    });
  });

  // GET /api/reports/export/:type
  static exportReport = asyncHandler(async (req, res, next) => {
    const { type } = req.params;
    const { format = 'csv' } = req.query;
    const userRole = req.user.role;

    let reportData = [];
    let filename = '';

    switch (type) {
      case 'inventory':
        const inventory = await Inventory.findAll({
          include: [
            { model: Product, attributes: ['sku', 'name', 'category', 'unit_price'] },
            { model: Warehouse, attributes: ['name'] },
          ],
        });

        reportData = inventory.map(item => ({
          SKU: item.product.sku,
          Product: item.product.name,
          Category: item.product.category,
          Quantity: item.quantity,
          UnitCost: item.product.unit_price,
          TotalValue: item.stock_value,
          Warehouse: item.warehouse.name,
          Status: item.status,
        }));

        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'purchase-orders':
        const pos = await PurchaseOrder.findAll({
          include: [{ model: Supplier, attributes: ['name'] }],
        });

        reportData = pos.map(po => ({
          PONumber: po.po_number,
          Supplier: po.supplier.name,
          Status: po.status,
          TotalAmount: po.total_amount,
          OrderDate: po.created_at,
          UpdatedDate: po.updated_at,
          AutoDrafted: po.auto_drafted ? 'Yes' : 'No',
        }));

        filename = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'audit-log':
        const logs = await AuditLog.findAll({
          include: [{ model: User, attributes: ['first_name', 'last_name', 'role'] }],
          limit: 5000,
        });

        reportData = logs.map(log => ({
          Timestamp: log.timestamp,
          User: `${log.user.first_name} ${log.user.last_name}`,
          Role: log.user.role,
          Action: log.action,
          Entity: log.table_name,
          IPAddress: log.ip_address || '-',
        }));

        filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid report type' });
    }

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(reportData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else if (format === 'pdf') {
      res.status(400).json({ success: false, error: 'PDF export not yet implemented' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid format' });
    }
  });
}

export default ReportController;
