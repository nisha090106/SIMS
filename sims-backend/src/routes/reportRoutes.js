import express from 'express';
import ReportController from '../controllers/reportController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authorize } from '../utils/authorize.js';

const router = express.Router();

// All reports require authentication
router.use(authMiddleware);

// Dashboard stats (accessible to all authenticated users)
router.get('/dashboard', ReportController.getDashboardStats);

// Inventory Valuation Report
router.get('/inventory-valuation', ReportController.getInventoryValuation);

// Stock Movement Report
router.get('/stock-movement', ReportController.getStockMovement);

// Low Stock Report
router.get('/low-stock', ReportController.getLowStock);

// Purchase Orders Report
router.get('/purchase-orders', ReportController.getPurchaseOrders);

// Request Fulfillment Report
router.get('/request-fulfillment', ReportController.getRequestFulfillment);

// Audit Log Report
router.get('/audit-log', authorize('admin'), ReportController.getAuditLog);

// Export Report (Admin only)
router.get('/export/:type', authorize('admin'), ReportController.exportReport);

export default router;
