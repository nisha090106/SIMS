import logger from '../config/logger.js';

export class NotificationService {
  /**
   * Creates/logs a low-stock notification
   * @param {Object} params
   * @param {string} params.type - Notification type (e.g. 'low_stock')
   * @param {string} params.message - Human readable message
   * @param {number} params.product_id - Product ID
   * @param {number} params.warehouse_id - Warehouse ID
   * @param {number} params.current_quantity - Current inventory level
   * @param {number} params.reorder_level - Reorder threshold
   */
  static async createNotification({ type, message, product_id, warehouse_id, current_quantity, reorder_level }) {
    logger.warn(
      `[NOTIFICATION - ${type.toUpperCase()}] Product ID: ${product_id}, Warehouse ID: ${warehouse_id}, Qty: ${current_quantity}, Reorder Level: ${reorder_level}. Message: ${message}`,
    );
    return true;
  }
}

export default NotificationService;
