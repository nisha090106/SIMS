import express from 'express';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  createUser,
  updateUser,
  setUserStatus,
  adminResetPassword,
  deleteUser,
  getAuditLog,
} from '../controllers/settingsController.js';

const router = express.Router();

// Every settings route requires a valid JWT
router.use(authMiddleware);

// ── Profile (any authenticated user) ────────────────────────────────────────
router.get('/profile',  getProfile);
router.put('/profile',  updateProfile);
router.put('/password', changePassword);

// ── User Management (admin only) ─────────────────────────────────────────────
router.get('/users',                            authorize('admin'), getUsers);
router.post('/users',                           authorize('admin'), createUser);
router.put('/users/:id',                        authorize('admin'), updateUser);
router.patch('/users/:id/status',               authorize('admin'), setUserStatus);
router.post('/users/:id/reset-password',        authorize('admin'), adminResetPassword);
router.delete('/users/:id',                     authorize('admin'), deleteUser);

// ── Audit Log (admin only) ────────────────────────────────────────────────────
router.get('/audit-log', authorize('admin'), getAuditLog);

export default router;
