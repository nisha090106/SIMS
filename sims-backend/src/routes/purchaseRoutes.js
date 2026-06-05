import express from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../controllers/purchaseController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { validate } from '../validators/schemas.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET all purchase orders (with pagination & filters)
router.get('/', asyncHandler(getPurchaseOrders));

// POST create new purchase order (admin, manager only)
router.post('/', authorize(['admin', 'manager']), asyncHandler(createPurchaseOrder));

// GET single purchase order
router.get('/:id', asyncHandler(getPurchaseOrderById));

// PUT update purchase order (admin, manager only)
router.put('/:id', authorize(['admin', 'manager']), asyncHandler(updatePurchaseOrder));

// PATCH approve purchase order (admin only)
router.patch('/:id/approve', authorize(['admin']), asyncHandler(approvePurchaseOrder));

// POST receive purchase order goods (admin, manager only)
router.post('/:id/receive', authorize(['admin', 'manager']), asyncHandler(receivePurchaseOrder));

// PATCH cancel purchase order (admin only)
router.patch('/:id/cancel', authorize(['admin']), asyncHandler(cancelPurchaseOrder));

export default router;
