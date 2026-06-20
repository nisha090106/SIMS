import { Op } from 'sequelize';
import { Notification } from '../models/index.js';
import asyncHandler from 'express-async-handler';
import logger from '../config/logger.js';

const uid = (req) => req.user?.id || req.user?.user_id;

/**
 * GET /api/notifications
 * Returns paginated notifications for the current user.
 * Query: page, limit, unread_only (true/false)
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const unreadOnly = req.query.unread_only === 'true';

  const where = { user_id: uid(req) };
  if (unreadOnly) where.is_read = false;

  const { count, rows } = await Notification.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  res.json({
    success: true,
    data: {
      notifications: rows,
      total:  count,
      page,
      pages:  Math.ceil(count / limit),
      limit,
    },
  });
});

/**
 * GET /api/notifications/unread-count
 * Lightweight endpoint polled by the frontend bell badge.
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.count({
    where: { user_id: uid(req), is_read: false },
  });
  res.json({ success: true, data: { count } });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read (must belong to current user).
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findOne({
    where: { id, user_id: uid(req) },
  });

  if (!notification) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }

  if (!notification.is_read) {
    await notification.update({ is_read: true });
  }

  res.json({ success: true, data: notification });
});

/**
 * POST /api/notifications/mark-all-read
 * Mark every unread notification for the current user as read.
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const [updated] = await Notification.update(
    { is_read: true },
    { where: { user_id: uid(req), is_read: false } },
  );

  res.json({ success: true, data: { updated } });
});

/**
 * DELETE /api/notifications/:id
 * Delete a single notification (owner only).
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findOne({
    where: { id, user_id: uid(req) },
  });

  if (!notification) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }

  await notification.destroy();
  res.json({ success: true, message: 'Notification deleted' });
});

/**
 * DELETE /api/notifications/clear-all
 * Delete all read notifications for the current user.
 */
export const clearReadNotifications = asyncHandler(async (req, res) => {
  const deleted = await Notification.destroy({
    where: { user_id: uid(req), is_read: true },
  });

  res.json({ success: true, data: { deleted } });
});
