import { Product, Inventory, Warehouse, PurchaseOrder, AuditLog, User, sequelize } from '../models/index.js';
import logger from '../config/logger.js';

export class ReportController {
  static async getDashboardStats(req, res, next) {
    try {
      // 1. Total unique products
      const totalProducts = await Product.count();

      // 2. Total Stock Value = sum of (quantity * unit_price)
      const stockValueResult = await sequelize.query(
        `SELECT SUM(i.quantity * p.unit_price) as total_value
         FROM inventory i
         JOIN products p ON i.product_id = p.product_id`,
        { type: sequelize.QueryTypes.SELECT },
      );
      const totalStockValue = Number(stockValueResult[0]?.total_value || 0);

      // 3. Low Stock Items count = count of unique products where quantity <= reorder_level
      const lowStockResult = await sequelize.query(
        `SELECT COUNT(DISTINCT i.product_id) as count
         FROM inventory i
         JOIN products p ON i.product_id = p.product_id
         WHERE i.quantity <= p.reorder_level`,
        { type: sequelize.QueryTypes.SELECT },
      );
      const lowStockCount = Number(lowStockResult[0]?.count || 0);

      // 4. Pending purchase orders count
      const pendingOrdersCount = await PurchaseOrder.count({
        where: { status: 'pending' },
      });

      // 5. Warehouse stock data (for bar chart)
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

      // 6. Category distribution data (for pie chart)
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

      // 7. Recent activity = last 5 audit log entries
      const recentLogs = await AuditLog.findAll({
        limit: 5,
        order: [['timestamp', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['full_name', 'email'],
          },
        ],
      });
      const recentActivity = recentLogs.map(log => ({
        action: `${log.action.toUpperCase()} ${log.table_name || ''}`,
        user: log.user?.full_name || log.user?.email || 'System User',
        timestamp: log.timestamp,
      }));

      res.status(200).json({
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
    } catch (error) {
      logger.error(`Get dashboard stats error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default ReportController;
