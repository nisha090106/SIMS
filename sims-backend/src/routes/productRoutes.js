import express from 'express';
import { ProductController } from '../controllers/productController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { productValidators, validate } from '../validators/schemas.js';

const router = express.Router();

// Public routes (auth required, all roles)
router.get('/', authMiddleware, asyncHandler(ProductController.getProducts));
router.get('/:id', authMiddleware, asyncHandler(ProductController.getProductById));

// Protected routes (admin and manager only)
router.post('/', authMiddleware, authorize('admin', 'manager'), validate(productValidators.create), asyncHandler(ProductController.createProduct));
router.put('/:id', authMiddleware, authorize('admin', 'manager'), validate(productValidators.update), asyncHandler(ProductController.updateProduct));

// Protected route (admin only)
router.delete('/:id', authMiddleware, authorize('admin'), asyncHandler(ProductController.deleteProduct));

export default router;
