import express from 'express';
import { BarcodeController } from '../controllers/barcodeController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// POST /api/barcodes/scan -> Scan a barcode (auth required: admin, manager, staff; NOT user)
router.post(
  '/scan',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  asyncHandler(BarcodeController.scanBarcode),
);

// GET /api/barcodes/lookup -> Look up product by barcode (auth required: all roles)
router.get(
  '/lookup',
  authMiddleware,
  asyncHandler(BarcodeController.lookupBarcode),
);

// GET /api/barcodes/history -> Get barcode scan history (auth required: admin, manager)
router.get(
  '/history',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(BarcodeController.getScanHistory),
);

// GET /api/barcodes/unrecognised -> Get unrecognised scans (auth required: admin, manager)
router.get(
  '/unrecognised',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(BarcodeController.processUnrecognisedScans),
);

// PATCH /api/barcodes/:scanId/link -> Link an unrecognised scan to a product (auth required: admin, manager)
router.patch(
  '/:scanId/link',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(BarcodeController.linkScanToProduct),
);

export default router;
