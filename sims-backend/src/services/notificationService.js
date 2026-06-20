/**
 * NotificationService
 *
 * Central service for creating, querying and managing in-app notifications.
 * The cron service (cronService.js) already imports this module, so the
 * public API must be stable.
 *
 * Notification types and their titles / links:
 * ─────────────────────────────────────────────────────────────
 *  po_created            PO created
 *  po_submitted          PO submitted for approval
 *  po_approved           PO approved
 *  po_shipped            PO marked as shipped
 *  po_received           PO received — stock updated
 *  po_cancelled          PO cancelled
 *  po_auto_drafted       Auto-drafted PO (low-stock trigger)
 *  request_created       New inventory request
 *  request_approved      Your request was approved
 *  request_rejected      Your request was rejected
 *  request_fulfilled     Your request was fulfilled
 *  request_cancelled     Request cancelled
 *  low_stock_auto_po     Low stock detected, PO auto-drafted
 *  nightly_sync_summary  Nightly inventory sync completed
 */

import { Notification, User } from '../models/index.js';
import logger from '../config/logger.js';

// ─── Internal type → title map ────────────────────────────────────────────────

const TYPE_TITLE = {
  po_created:           '📦 Purchase Order Created',
  po_submitted:         '📤 PO Submitted for Approval',
  po_approved:          '✅ Purchase Order Approved',
  po_shipped:           '🚚 Purchase Order Shipped',
  po_received:          '📥 Goods Received',
  po_cancelled:         '❌ Purchase Order Cancelled',
  po_auto_drafted:      '⚡ Auto-Draft PO Created',
  request_created:      '📋 New Inventory Request',
  request_approved:     '✅ Request Approved',
  request_rejected:     '❌ Request Rejected',
  request_fulfilled:    '🎉 Request Fulfilled',
  request_cancelled:    '🚫 Request Cancelled',
  low_stock_auto_po:    '⚠️ Low Stock Alert',
  low_stock_auto_po_alias: '⚠️ Low Stock Alert',  // alias used by cron
  nightly_sync_summary: '🌙 Nightly Sync Complete',
};

class NotificationService {
  /**
   * Create a single notification for one user.
   *
   * @param {object} opts
   * @param {number}  opts.userId       - recipient user id
   * @param {string}  opts.type         - notification type key
   * @param {string}  opts.message      - human-readable message body
   * @param {string}  [opts.title]      - overrides auto title
   * @param {string}  [opts.link]       - frontend route (/purchase-orders/42)
   * @param {object}  [opts.metadata]   - extra JSON payload
   *
   * Legacy cron signature (no userId, uses top-level product/warehouse fields):
   * @param {object}  opts.product_id
   * @param {object}  opts.warehouse_id
   * @param {object}  opts.current_quantity
   * @param {object}  opts.reorder_level
   */
  static async createNotification(opts) {
    try {
      // Support legacy cron call format where userId is missing
      const userId = opts.userId || opts.user_id;
      if (!userId) {
        logger.warn('[Notification] createNotification called without userId — skipping');
        return null;
      }

      const type    = opts.type    || 'system';
      const message = opts.message || '';
      const title   = opts.title   || TYPE_TITLE[type] || '🔔 Notification';
      const link    = opts.link    || null;

      // Merge legacy fields into metadata
      const metadata = {
        ...(opts.metadata || {}),
        ...(opts.product_id    !== undefined && { product_id:    opts.product_id }),
        ...(opts.warehouse_id  !== undefined && { warehouse_id:  opts.warehouse_id }),
        ...(opts.current_quantity !== undefined && { current_quantity: opts.current_quantity }),
        ...(opts.reorder_level !== undefined && { reorder_level: opts.reorder_level }),
      };

      const notification = await Notification.create({
        user_id:  userId,
        type,
        title,
        message,
        is_read:  false,
        link,
        metadata: Object.keys(metadata).length ? metadata : null,
      });

      logger.debug(`[Notification] Created #${notification.id} type=${type} for user ${userId}`);
      return notification;
    } catch (err) {
      logger.error(`[Notification] createNotification failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Broadcast a notification to every user with any of the given roles.
   */
  static async notifyByRole(roles, opts) {
    try {
      const users = await User.findAll({
        where: { role: roles, status: 'active' },
        attributes: ['id'],
      });

      const results = await Promise.all(
        users.map((u) => NotificationService.createNotification({ ...opts, userId: u.id })),
      );
      return results.filter(Boolean).length;
    } catch (err) {
      logger.error(`[Notification] notifyByRole failed: ${err.message}`);
      return 0;
    }
  }

  /**
   * Broadcast to a list of specific user IDs.
   */
  static async notifyUsers(userIds, opts) {
    try {
      const results = await Promise.all(
        [...new Set(userIds)].filter(Boolean).map((id) =>
          NotificationService.createNotification({ ...opts, userId: id }),
        ),
      );
      return results.filter(Boolean).length;
    } catch (err) {
      logger.error(`[Notification] notifyUsers failed: ${err.message}`);
      return 0;
    }
  }

  // ─── PO Triggers ──────────────────────────────────────────────────────────

  static async onPOCreated(po, creatorId) {
    return NotificationService.notifyByRole(['admin', 'manager'], {
      type:    'po_created',
      message: `PO ${po.po_number} was created by user #${creatorId}`,
      link:    `/purchase-orders/${po.po_id}`,
      metadata: { po_id: po.po_id, po_number: po.po_number },
    });
  }

  static async onPOSubmitted(po, creatorId) {
    return NotificationService.notifyByRole(['admin'], {
      type:    'po_submitted',
      message: `PO ${po.po_number} has been submitted and is awaiting approval`,
      link:    `/purchase-orders/${po.po_id}`,
      metadata: { po_id: po.po_id, po_number: po.po_number },
    });
  }

  static async onPOApproved(po, approverId) {
    const notifyUserIds = [po.created_by].filter(Boolean);
    return NotificationService.notifyUsers(notifyUserIds, {
      type:    'po_approved',
      message: `Your PO ${po.po_number} has been approved`,
      link:    `/purchase-orders/${po.po_id}`,
      metadata: { po_id: po.po_id, po_number: po.po_number, approved_by: approverId },
    });
  }

  static async onPOShipped(po) {
    const notifyUserIds = [po.created_by, po.approved_by].filter(Boolean);
    return NotificationService.notifyUsers(notifyUserIds, {
      type:    'po_shipped',
      message: `PO ${po.po_number} has been shipped and is on its way`,
      link:    `/purchase-orders/${po.po_id}`,
      metadata: { po_id: po.po_id, po_number: po.po_number },
    });
  }

  static async onPOReceived(po, receiverId) {
    await NotificationService.notifyByRole(['admin'], {
      type:    'po_received',
      message: `PO ${po.po_number} has been received — inventory updated`,
      link:    `/purchase-orders/${po.po_id}`,
      metadata: { po_id: po.po_id, po_number: po.po_number, received_by: receiverId },
    });
    // Also notify the creator
    if (po.created_by && po.created_by !== receiverId) {
      return NotificationService.createNotification({
        userId:  po.created_by,
        type:    'po_received',
        message: `Your PO ${po.po_number} has been received and stock was updated`,
        link:    `/purchase-orders/${po.po_id}`,
        metadata: { po_id: po.po_id, po_number: po.po_number },
      });
    }
  }

  static async onPOCancelled(po, cancelledBy) {
    const notifyUserIds = [po.created_by, po.approved_by].filter(Boolean);
    return NotificationService.notifyUsers(notifyUserIds, {
      type:    'po_cancelled',
      message: `PO ${po.po_number} has been cancelled`,
      link:    `/purchase-orders/${po.po_id}`,
      metadata: { po_id: po.po_id, po_number: po.po_number, cancelled_by: cancelledBy },
    });
  }

  // ─── Request Triggers ─────────────────────────────────────────────────────

  static async onRequestCreated(request) {
    return NotificationService.notifyByRole(['admin', 'manager'], {
      type:    'request_created',
      message: `New request ${request.request_number} submitted (${request.priority} priority)`,
      link:    `/requests`,
      metadata: { request_id: request.id, request_number: request.request_number, priority: request.priority },
    });
  }

  static async onRequestApproved(request, approverId) {
    return NotificationService.createNotification({
      userId:  request.requester_id,
      type:    'request_approved',
      message: `Your request ${request.request_number} has been approved`,
      link:    `/user/my-requests`,
      metadata: { request_id: request.id, request_number: request.request_number, approved_by: approverId },
    });
  }

  static async onRequestRejected(request, rejectedBy, reason) {
    return NotificationService.createNotification({
      userId:  request.requester_id,
      type:    'request_rejected',
      message: `Your request ${request.request_number} was rejected${reason ? `: ${reason}` : ''}`,
      link:    `/user/my-requests`,
      metadata: { request_id: request.id, request_number: request.request_number, rejection_reason: reason },
    });
  }

  static async onRequestFulfilled(request, fulfillerId) {
    return NotificationService.createNotification({
      userId:  request.requester_id,
      type:    'request_fulfilled',
      message: `Your request ${request.request_number} has been fulfilled`,
      link:    `/user/my-requests`,
      metadata: { request_id: request.id, request_number: request.request_number, fulfilled_by: fulfillerId },
    });
  }

  static async onRequestCancelled(request) {
    return NotificationService.notifyByRole(['admin', 'manager'], {
      type:    'request_cancelled',
      message: `Request ${request.request_number} was cancelled`,
      link:    `/requests`,
      metadata: { request_id: request.id, request_number: request.request_number },
    });
  }
}

export default NotificationService;
