import express from 'express';
import { WarehouseController } from '../controllers/warehouseController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { warehouseValidators, validate } from '../validators/schemas.js';

const router = express.Router();

// Public routes (auth required)
router.get('/', authMiddleware, asyncHandler(WarehouseController.getAllWarehouses));
router.get('/managers', authMiddleware, asyncHandler(WarehouseController.getManagers));
router.get('/:id', authMiddleware, asyncHandler(WarehouseController.getWarehouseById));
router.get('/:id/capacity', authMiddleware, asyncHandler(WarehouseController.getCapacityUsage));

// Protected routes (admin only for create/delete)
router.post('/', authMiddleware, authorize('admin'), validate(warehouseValidators.create), asyncHandler(WarehouseController.createWarehouse));
router.put('/:id', authMiddleware, authorize('admin', 'manager'), validate(warehouseValidators.update), asyncHandler(WarehouseController.updateWarehouse));
router.delete('/:id', authMiddleware, authorize('admin'), asyncHandler(WarehouseController.deleteWarehouse));

export default router;
