import express from 'express';
import { RequestController } from '../controllers/requestController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// GET /api/requests - Get all requests (role-based filtering)
router.get(
  '/',
  authMiddleware,
  authorize('admin', 'manager', 'staff', 'requester', 'user'),
  asyncHandler(RequestController.getAllRequests),
);

// GET /api/requests/:id - Get single request
router.get(
  '/:id',
  authMiddleware,
  authorize('admin', 'manager', 'staff', 'requester', 'user'),
  asyncHandler(RequestController.getRequestById),
);

// POST /api/requests - Create new request
router.post(
  '/',
  authMiddleware,
  authorize('admin', 'manager', 'staff', 'requester', 'user'),
  asyncHandler(RequestController.createRequest),
);

// POST /api/requests/:id/approve - Approve request
router.post(
  '/:id/approve',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(RequestController.approveRequest),
);

// POST /api/requests/:id/reject - Reject request
router.post(
  '/:id/reject',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(RequestController.rejectRequest),
);

// POST /api/requests/:id/fulfill - Fulfill request
router.post(
  '/:id/fulfill',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  asyncHandler(RequestController.fulfillRequest),
);

// POST /api/requests/:id/cancel - Cancel request
router.post(
  '/:id/cancel',
  authMiddleware,
  authorize('admin', 'manager', 'staff', 'requester', 'user'),
  asyncHandler(RequestController.cancelRequest),
);

export default router;
