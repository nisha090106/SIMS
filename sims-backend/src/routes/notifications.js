import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification endpoints require authentication
router.use(authMiddleware);

// GET  /api/notifications              — paginated list (add ?unread_only=true to filter)
router.get('/',                  getNotifications);

// GET  /api/notifications/unread-count — fast poll endpoint for bell badge
router.get('/unread-count',      getUnreadCount);

// POST /api/notifications/mark-all-read
router.post('/mark-all-read',    markAllAsRead);

// DELETE /api/notifications/clear-all — delete all already-read notifications
router.delete('/clear-all',      clearReadNotifications);

// PATCH /api/notifications/:id/read
router.patch('/:id/read',        markAsRead);

// DELETE /api/notifications/:id
router.delete('/:id',            deleteNotification);

export default router;
