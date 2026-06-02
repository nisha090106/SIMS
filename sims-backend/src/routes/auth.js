import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// Public routes
router.post('/register', asyncHandler(AuthController.register));
router.post('/login', asyncHandler(AuthController.login));
router.post('/refresh-token', asyncHandler(AuthController.refreshToken));

// Protected routes
router.get('/profile', authMiddleware, asyncHandler(AuthController.getProfile));
router.post('/logout', authMiddleware, asyncHandler(AuthController.logout));

export default router;
