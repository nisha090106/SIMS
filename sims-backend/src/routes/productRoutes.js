import express from 'express';
import { ProductController } from '../controllers/productController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/', asyncHandler(ProductController.getAllProducts));
router.get('/:id', asyncHandler(ProductController.getProductById));

// Protected routes (admin and manager only)
router.post('/', authMiddleware, authorize('admin', 'manager'), asyncHandler(ProductController.createProduct));
router.put('/:id', authMiddleware, authorize('admin', 'manager'), asyncHandler(ProductController.updateProduct));
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), asyncHandler(ProductController.deleteProduct));

export default router;
