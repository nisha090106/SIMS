import express from 'express';
import {
  importProducts,
  importInventory,
  importWarehouses,
  uploadAndImport,
  getImportJob,
  getImportHistory,
  downloadTemplate,
} from '../controllers/importController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../config/multer.js';

const router = express.Router();
router.use(authMiddleware);

// ── Template download (no role restriction — all auth'd users) ─
router.get('/template/:type', downloadTemplate);

// ── Dedicated import endpoints ─────────────────────────────────
router.post('/products',
  authorize('admin', 'manager'),
  upload.single('file'),
  importProducts,
);

router.post('/inventory',
  authorize('admin', 'manager', 'staff'),
  upload.single('file'),
  importInventory,
);

router.post('/warehouses',
  authorize('admin'),             // Admin only
  upload.single('file'),
  importWarehouses,
);

// ── Legacy unified endpoint (kept for backward compat) ─────────
router.post('/upload',
  authorize('admin', 'manager'),
  upload.single('file'),
  uploadAndImport,
);

// ── History + status ──────────────────────────────────────────
router.get('/',        authorize('admin', 'manager'), getImportHistory);
router.get('/:jobId',  authorize('admin', 'manager'), getImportJob);

export default router;
