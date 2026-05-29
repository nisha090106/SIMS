import express from 'express';
import { InventoryController } from '../controllers/inventoryController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// Public routes (auth required)
router.get('/', authMiddleware, asyncHandler(InventoryController.getAllInventory));
router.get('/:id', authMiddleware, asyncHandler(InventoryController.getInventoryById));
router.get('/summary/overview', authMiddleware, asyncHandler(InventoryController.getInventorySummary));
router.get('/alerts/low-stock', authMiddleware, asyncHandler(InventoryController.getLowStockItems));

// Protected routes (manager and staff can create/update)
router.post('/', authMiddleware, authorize('admin', 'manager', 'staff'), asyncHandler(InventoryController.createInventory));
router.put('/:id', authMiddleware, authorize('admin', 'manager', 'staff'), asyncHandler(InventoryController.updateInventory));

export default router;
