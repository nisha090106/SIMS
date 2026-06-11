import express from 'express';
import { getDashboardStats, getDashboardCharts } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authMiddleware);

router.get('/stats',  asyncHandler(getDashboardStats));
router.get('/charts', asyncHandler(getDashboardCharts));

export default router;
