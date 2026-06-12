import express from 'express';
import {
  getAllWarehouses,
  getWarehouseById,
  getWarehouseStats,
  getWarehouseInventory,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getManagers,
  getCapacityUsage,
} from '../controllers/warehouseController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { warehouseValidators, validate } from '../validators/schemas.js';

const router = express.Router();
router.use(authMiddleware);

// ── Special paths before /:id ─────────────────────────────────
router.get('/managers', asyncHandler(getManagers));

// ── Warehouse CRUD ────────────────────────────────────────────
router.get('/',    asyncHandler(getAllWarehouses));
router.get('/:id', asyncHandler(getWarehouseById));
router.get('/:id/stats',     asyncHandler(getWarehouseStats));
router.get('/:id/capacity',  asyncHandler(getCapacityUsage));  // backward compat
router.get('/:id/inventory', asyncHandler(getWarehouseInventory));

router.post('/',    authorize('admin'), validate(warehouseValidators.create), asyncHandler(createWarehouse));
router.put('/:id',  authorize('admin'), validate(warehouseValidators.update), asyncHandler(updateWarehouse));
router.delete('/:id', authorize('admin'), asyncHandler(deleteWarehouse));

export default router;
