import express from 'express';
import { SalesController } from '../controllers/salesController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All endpoints require a valid JWT
router.use(authMiddleware);

// ── Read ─────────────────────────────────────────────────────────────────────
// GET  /api/sales-orders
//   Query: page, limit, status, search, warehouseId, from, to
router.get('/', SalesController.getAll);

// GET  /api/sales-orders/:id
router.get('/:id', SalesController.getById);

// ── Create ────────────────────────────────────────────────────────────────────
// POST /api/sales-orders
//   Body: { customer_name, warehouse_id, items, delivery_date?, notes? }
router.post('/', authorize('admin', 'manager', 'staff'), SalesController.create);

// ── Edit ──────────────────────────────────────────────────────────────────────
// PUT  /api/sales-orders/:id   (draft / pending only)
router.put('/:id', authorize('admin', 'manager', 'staff'), SalesController.update);

// ── Workflow ──────────────────────────────────────────────────────────────────
// POST /api/sales-orders/:id/fulfill   draft|pending → dispatched  + stock deducted
router.post('/:id/fulfill',  authorize('admin', 'manager', 'staff'), SalesController.fulfill);

// POST /api/sales-orders/:id/deliver   dispatched → delivered
router.post('/:id/deliver',  authorize('admin', 'manager', 'staff'), SalesController.deliver);

// POST /api/sales-orders/:id/cancel    draft|pending → cancelled
//   Body: { reason? }
router.post('/:id/cancel',   authorize('admin', 'manager', 'staff'), SalesController.cancel);

// ── Delete ────────────────────────────────────────────────────────────────────
// DELETE /api/sales-orders/:id   (draft or cancelled only)
router.delete('/:id', authorize('admin', 'manager'), SalesController.delete);

export default router;
