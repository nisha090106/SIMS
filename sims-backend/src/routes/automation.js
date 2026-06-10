import express from 'express';
import {
  getAutomationLogs,
  getReorderRules,
  createReorderRule,
  updateReorderRule,
  toggleReorderRule,
  triggerJobManually,
} from '../controllers/automationController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// GET   /api/automation/logs                  → getAutomationLogs (admin)
router.get(
  '/logs',
  authMiddleware,
  authorize('admin'),
  asyncHandler(getAutomationLogs),
);

// GET   /api/automation/reorder-rules         → getReorderRules (admin, manager)
router.get(
  '/reorder-rules',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(getReorderRules),
);

// POST  /api/automation/reorder-rules         → createReorderRule (admin, manager)
router.post(
  '/reorder-rules',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(createReorderRule),
);

// PUT  /api/automation/reorder-rules/:id     → updateReorderRule (admin, manager)
router.put(
  '/reorder-rules/:id',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(updateReorderRule),
);

// PATCH /api/automation/reorder-rules/:id/toggle → toggleReorderRule (admin, manager)
router.patch(
  '/reorder-rules/:id/toggle',
  authMiddleware,
  authorize('admin', 'manager'),
  asyncHandler(toggleReorderRule),
);

// POST  /api/automation/trigger/:jobName      → triggerJobManually (admin)
router.post(
  '/trigger/:jobName',
  authMiddleware,
  authorize('admin'),
  asyncHandler(triggerJobManually),
);

export default router;
