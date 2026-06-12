import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
} from '../controllers/productController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { productValidators, validate } from '../validators/schemas.js';

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// ── Categories (before /:id to avoid conflict) ──────────────────
router.get('/categories',  asyncHandler(getCategories));
router.post('/categories',
  authorize('admin', 'manager'),
  asyncHandler(createCategory),
);

// ── Products ─────────────────────────────────────────────────────
router.get('/',    asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProductById));

router.post('/',
  authorize('admin', 'manager'),
  validate(productValidators.create),
  asyncHandler(createProduct),
);

router.put('/:id',
  authorize('admin', 'manager'),
  validate(productValidators.update),
  asyncHandler(updateProduct),
);

router.delete('/:id',
  authorize('admin'),
  asyncHandler(deleteProduct),
);

export default router;
