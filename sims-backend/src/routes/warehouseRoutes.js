import express from 'express';
import { WarehouseController } from '../controllers/warehouseController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// Public routes (auth required)
router.get('/', authMiddleware, asyncHandler(WarehouseController.getAllWarehouses));
router.get('/:id', authMiddleware, asyncHandler(WarehouseController.getWarehouseById));
router.get('/:id/capacity', authMiddleware, asyncHandler(WarehouseController.getCapacityUsage));

// Protected routes (admin and manager only)
router.post('/', authMiddleware, authorize('admin', 'manager'), asyncHandler(WarehouseController.createWarehouse));
router.put('/:id', authMiddleware, authorize('admin', 'manager'), asyncHandler(WarehouseController.updateWarehouse));
router.delete('/:id', authMiddleware, authorize('admin'), asyncHandler(WarehouseController.deleteWarehouse));

export default router;
