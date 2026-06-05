import express from 'express';
import { SupplierController } from '../controllers/supplierController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { supplierValidators, validate } from '../validators/schemas.js';

const router = express.Router();

// Public routes (auth required)
router.get('/', authMiddleware, asyncHandler(SupplierController.getSuppliers));
router.get('/:id', authMiddleware, asyncHandler(SupplierController.getSupplierById));

// Protected routes (admin and manager only)
router.post('/', authMiddleware, authorize('admin', 'manager'), validate(supplierValidators.create), asyncHandler(SupplierController.createSupplier));
router.put('/:id', authMiddleware, authorize('admin', 'manager'), validate(supplierValidators.update), asyncHandler(SupplierController.updateSupplier));
router.patch('/:id/rating', authMiddleware, authorize('admin', 'manager'), validate(supplierValidators.updateRating), asyncHandler(SupplierController.updateSupplierRating));

// Protected route (admin only)
router.delete('/:id', authMiddleware, authorize('admin'), asyncHandler(SupplierController.deleteSupplier));

export default router;
