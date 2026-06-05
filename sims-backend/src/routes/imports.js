import express from 'express';
import { 
  uploadAndImport, 
  getImportJob, 
  getImportHistory, 
  downloadTemplate, 
} from '../controllers/importController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../config/multer.js';

const router = express.Router();

// Apply auth and admin/manager authorization middleware globally to all import routes
router.use(authMiddleware);
router.use(authorize('admin', 'manager'));

// POST /api/imports/upload - Upload file and start import
router.post('/upload', upload.single('file'), uploadAndImport);

// GET /api/imports - Get last 20 import jobs
router.get('/', getImportHistory);

// GET /api/imports/:jobId - Get status/progress of import job
router.get('/:jobId', getImportJob);

// GET /api/imports/template/:type - Download import CSV template
router.get('/template/:type', downloadTemplate);

export default router;
