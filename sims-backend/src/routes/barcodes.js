import express from 'express';
import { BarcodeController } from '../controllers/barcodeController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import warehouseIsolation from '../middlewares/warehouseIsolation.js';

const router = express.Router();

// POST /api/barcodes/scan -> Scan a barcode (auth required: admin, manager, staff; NOT user)
router.post(
  '/scan',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.scanBarcode),
);

// GET /api/barcodes/lookup -> Look up product by barcode (auth required: all roles)
router.get(
  '/lookup',
  authMiddleware,
  warehouseIsolation,
  asyncHandler(BarcodeController.lookupBarcode),
);

// GET /api/barcodes/history -> Get barcode scan history (auth required: admin, manager)
router.get(
  '/history',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.getScanHistory),
);

// GET /api/barcodes/unrecognised -> Get unrecognised scans (auth required: admin, manager)
router.get(
  '/unrecognised',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.processUnrecognisedScans),
);

// PATCH /api/barcodes/:scanId/link -> Link an unrecognised scan to a product (auth required: admin, manager)
router.patch(
  '/:scanId/link',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.linkScanToProduct),
);

// ============ NEW BARCODE MANAGEMENT ROUTES ============

// GET /api/barcodes/scan/:barcode -> Lookup product by barcode (scoped to warehouse)
router.get(
  '/scan/:barcode',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.scanLookup),
);

// POST /api/barcodes/stock-in -> Stock in via barcode
router.post(
  '/stock-in',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.stockIn),
);

// POST /api/barcodes/stock-out -> Stock out via barcode
router.post(
  '/stock-out',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.stockOut),
);

// POST /api/barcodes/audit -> Audit via barcode
router.post(
  '/audit',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.audit),
);

// GET /api/barcodes/unknown -> Get unknown barcodes (Admin: all; Manager: own WH)
router.get(
  '/unknown',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.getUnknownBarcodes),
);

// POST /api/barcodes/unknown/:id/assign -> Assign unknown barcode to product
router.post(
  '/unknown/:id/assign',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.assignUnknownBarcode),
);

// GET /api/barcodes/generate -> Generate barcode for product
router.get(
  '/generate',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(BarcodeController.generateBarcode),
);

export default router;
