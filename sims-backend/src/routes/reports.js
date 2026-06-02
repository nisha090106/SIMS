import express from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

router.get('/dashboard', authMiddleware, asyncHandler(ReportController.getDashboardStats));

export default router;
