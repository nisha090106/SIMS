import express from 'express';
import {
  getInventory,
  getInventoryById,
  stockIn,
  stockOut,
  adjustStock,
  transferStock,
  getLowStock,
  getValuation,
  getInventorySummary,
  updateStock,
} from '../controllers/inventoryController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();
router.use(authMiddleware);

// ── Special paths first (before /:id) ─────────────────────────
router.get('/summary',   asyncHandler(getInventorySummary));
router.get('/low-stock', asyncHandler(getLowStock));
router.get('/valuation', asyncHandler(getValuation));

router.post('/stock-in',  authorize('admin', 'manager', 'staff'), asyncHandler(stockIn));
router.post('/stock-out', authorize('admin', 'manager', 'staff'), asyncHandler(stockOut));
router.post('/adjust',    authorize('admin', 'manager'),          asyncHandler(adjustStock));
router.post('/transfer',  authorize('admin', 'manager'),          asyncHandler(transferStock));

// ── Generic CRUD ──────────────────────────────────────────────
router.get('/',    asyncHandler(getInventory));
router.get('/:id', asyncHandler(getInventoryById));
router.put('/:id', authorize('admin', 'manager'), asyncHandler(updateStock));

// Backward compat: old POST /transfer route
router.post('/transfer', authorize('admin', 'manager'), asyncHandler(transferStock));

export default router;
