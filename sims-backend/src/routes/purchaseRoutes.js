import express from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  shipPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../controllers/purchaseController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();
router.use(authMiddleware);

// List + detail (all auth'd roles)
router.get('/',    asyncHandler(getPurchaseOrders));
router.get('/:id', asyncHandler(getPurchaseOrderById));

// Create + Update (admin / manager)
router.post('/',    authorize('admin', 'manager'), asyncHandler(createPurchaseOrder));
router.put('/:id',  authorize('admin', 'manager'), asyncHandler(updatePurchaseOrder));

// Lifecycle transitions
router.post('/:id/submit',  authorize('admin', 'manager'), asyncHandler(submitPurchaseOrder));
router.post('/:id/approve', authorize('admin', 'manager'), asyncHandler(approvePurchaseOrder));
router.post('/:id/ship',    authorize('admin', 'manager'), asyncHandler(shipPurchaseOrder));
router.post('/:id/receive', authorize('admin', 'manager'), asyncHandler(receivePurchaseOrder));
router.post('/:id/cancel',  authorize('admin'),            asyncHandler(cancelPurchaseOrder));

// Backward-compat aliases (old frontend used PATCH)
router.patch('/:id/approve', authorize('admin', 'manager'), asyncHandler(approvePurchaseOrder));
router.patch('/:id/cancel',  authorize('admin'),            asyncHandler(cancelPurchaseOrder));

export default router;
