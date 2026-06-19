import express from 'express';
import ReportController from '../controllers/reportController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authorize } from '../utils/authorize.js';

const router = express.Router();

// All report endpoints require a valid JWT
router.use(authMiddleware);

// ── Dashboard ────────────────────────────────────────────────────────────────
// GET /api/reports/dashboard
router.get('/dashboard', ReportController.getDashboardStats);

// ── Inventory ────────────────────────────────────────────────────────────────
// GET /api/reports/inventory
// Query: warehouseId, category, search, status (low_stock|out_of_stock), page, limit
router.get('/inventory', ReportController.getInventoryReport);

// GET /api/reports/inventory-valuation  (legacy endpoint, kept for compatibility)
// Query: warehouseId, category
router.get('/inventory-valuation', ReportController.getInventoryValuation);

// GET /api/reports/low-stock
// Query: warehouseId, category, page, limit
router.get('/low-stock', ReportController.getLowStock);

// ── Stock Movement ───────────────────────────────────────────────────────────
// GET /api/reports/stock-movement
// Query: from, to, action, page, limit
router.get('/stock-movement', ReportController.getStockMovement);

// ── Sales ────────────────────────────────────────────────────────────────────
// GET /api/reports/sales
// Query: warehouseId, from, to, status, search, page, limit
router.get('/sales', ReportController.getSalesReport);

// ── Supplier Performance ─────────────────────────────────────────────────────
// GET /api/reports/supplier-performance
// Query: supplierId, from, to, status, page, limit
router.get('/supplier-performance', ReportController.getSupplierPerformance);

// ── Purchase Orders ──────────────────────────────────────────────────────────
// GET /api/reports/purchase-orders
// Query: supplierId, warehouseId, from, to, status, autoDrafted, page, limit
router.get('/purchase-orders', ReportController.getPurchaseOrders);

// ── Request Fulfillment ──────────────────────────────────────────────────────
// GET /api/reports/request-fulfillment
// Query: from, to, status, requesterId, warehouseId, page, limit
router.get('/request-fulfillment', ReportController.getRequestFulfillment);

// ── Audit Log (admin only) ───────────────────────────────────────────────────
// GET /api/reports/audit-log
// Query: userId, action, from, to, page, limit
router.get('/audit-log', authorize('admin'), ReportController.getAuditLog);

// ── Export (admin only) ──────────────────────────────────────────────────────
// GET /api/reports/export/:type
// :type = inventory | sales | purchase-orders | supplier-performance | audit-log
// Query: format (csv|json), from, to, warehouseId, supplierId, status
router.get('/export/:type', authorize('admin'), ReportController.exportReport);

export default router;
