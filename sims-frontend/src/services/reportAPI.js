/**
 * Report API methods — thin wrappers over the shared axios instance.
 * All endpoints live under /api/reports (mounted in server.js).
 */
import api from './api';

const reportAPI = {
  // Dashboard summary (used by the overview card at the top)
  getDashboard: () => api.get('/reports/dashboard'),

  // ── Inventory ──────────────────────────────────────────────────────────
  // GET /reports/inventory
  // params: warehouseId, category, search, status, page, limit
  getInventory: (params) => api.get('/reports/inventory', { params }),

  // GET /reports/inventory-valuation (legacy, kept for compat)
  getInventoryValuation: (params) => api.get('/reports/inventory-valuation', { params }),

  // GET /reports/low-stock
  // params: warehouseId, category, page, limit
  getLowStock: (params) => api.get('/reports/low-stock', { params }),

  // ── Stock Movement ─────────────────────────────────────────────────────
  // GET /reports/stock-movement
  // params: from, to, action, page, limit
  getStockMovement: (params) => api.get('/reports/stock-movement', { params }),

  // ── Supplier Performance ───────────────────────────────────────────────
  // GET /reports/supplier-performance
  // params: supplierId, from, to, status, page, limit
  getSupplierPerformance: (params) => api.get('/reports/supplier-performance', { params }),

  // ── Sales ──────────────────────────────────────────────────────────────
  // GET /reports/sales
  // params: warehouseId, from, to, status, search, page, limit
  getSales: (params) => api.get('/reports/sales', { params }),

  // ── Purchase Orders ────────────────────────────────────────────────────
  // GET /reports/purchase-orders
  // params: supplierId, warehouseId, from, to, status, autoDrafted, page, limit
  getPurchaseOrders: (params) => api.get('/reports/purchase-orders', { params }),

  // ── Request Fulfillment ────────────────────────────────────────────────
  getRequestFulfillment: (params) => api.get('/reports/request-fulfillment', { params }),

  // ── Audit Log (admin only) ─────────────────────────────────────────────
  getAuditLog: (params) => api.get('/reports/audit-log', { params }),

  // ── Export ────────────────────────────────────────────────────────────
  // type: inventory | sales | purchase-orders | supplier-performance | audit-log
  // params: format (csv|json), from, to, warehouseId, supplierId, status
  exportReport: (type, params) =>
    api.get(`/reports/export/${type}`, { params, responseType: 'blob' }),
};

export default reportAPI;
