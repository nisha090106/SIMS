import express from 'express';
import { InventoryController } from '../controllers/inventoryController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// GET /api/inventory/summary
router.get('/summary', authMiddleware, asyncHandler(InventoryController.getInventorySummary));

// GET /api/inventory/low-stock
router.get('/low-stock', authMiddleware, asyncHandler(InventoryController.getLowStock));

// GET /api/inventory
router.get('/', authMiddleware, asyncHandler(InventoryController.getInventory));

// PUT /api/inventory/:id
router.put('/:id', authMiddleware, authorize('admin', 'manager'), asyncHandler(InventoryController.updateStock));

// POST /api/inventory/transfer
router.post('/transfer', authMiddleware, authorize('admin', 'manager'), asyncHandler(InventoryController.transferStock));

// POST /api/inventory/adjust
router.post('/adjust', authMiddleware, authorize('admin', 'manager'), asyncHandler(InventoryController.adjustInventory));

export default router;
