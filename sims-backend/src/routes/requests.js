import express from 'express';
import {
  getProductCatalog,
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  cancelRequest,
  approveRequest,
  rejectRequest,
  fulfillRequest,
} from '../controllers/userRequestController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import warehouseIsolation from '../middlewares/warehouseIsolation.js';

const router = express.Router();

// GET   /api/catalog              → getProductCatalog (user, staff, manager, admin)
router.get(
  '/catalog',
  authMiddleware,
  authorize('user', 'staff', 'manager', 'admin'),
  asyncHandler(getProductCatalog),
);

// POST  /api/requests             → createRequest (user, staff)
router.post(
  '/requests',
  authMiddleware,
  authorize('user', 'staff'),
  asyncHandler(createRequest),
);

// GET   /api/requests/my          → getMyRequests (user, staff)
router.get(
  '/requests/my',
  authMiddleware,
  authorize('user', 'staff'),
  asyncHandler(getMyRequests),
);

// GET   /api/requests             → getAllRequests (admin, manager)
router.get(
  '/requests',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(getAllRequests),
);

// GET   /api/requests/:id         → getRequestById (user, staff, admin, manager)
router.get(
  '/requests/:id',
  authMiddleware,
  authorize('user', 'staff', 'admin', 'manager'),
  warehouseIsolation,
  asyncHandler(getRequestById),
);

// PATCH /api/requests/:id/cancel  → cancelRequest (user, staff)
router.patch(
  '/requests/:id/cancel',
  authMiddleware,
  authorize('user', 'staff'),
  asyncHandler(cancelRequest),
);

// PATCH /api/requests/:id/approve → approveRequest (admin, manager)
router.patch(
  '/requests/:id/approve',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(approveRequest),
);

// PATCH /api/requests/:id/reject  → rejectRequest (admin, manager)
router.patch(
  '/requests/:id/reject',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(rejectRequest),
);

// PATCH /api/requests/:id/fulfill → fulfillRequest (admin, manager)
router.patch(
  '/requests/:id/fulfill',
  authMiddleware,
  authorize('admin', 'manager', 'staff'),
  warehouseIsolation,
  asyncHandler(fulfillRequest),
);

export default router;
