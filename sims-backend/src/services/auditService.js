import { AuditLog } from '../models/index.js';
import logger from '../config/logger.js';

export class AuditService {
  // Log audit entry
  static async log(userId, action, tableName, changes = null, ipAddress = null) {
    try {
      await AuditLog.create({
        user_id: userId,
        action,
        table_name: tableName,
        changes,
        ip_address: ipAddress,
      });
    } catch (error) {
      logger.error(`Audit log error: ${error.message}`);
    }
  }

  // Get audit logs for user
  static async getUserAuditLogs(userId, limit = 50, offset = 0) {
    try {
      const logs = await AuditLog.findAll({
        where: { user_id: userId },
        limit,
        offset,
        order: [['timestamp', 'DESC']],
      });

      return logs;
    } catch (error) {
      logger.error(`Get audit logs error: ${error.message}`);
      throw error;
    }
  }

  // Get all audit logs
  static async getAllAuditLogs(limit = 100, offset = 0, filters = {}) {
    try {
      const logs = await AuditLog.findAll({
        where: filters,
        include: [
          {
            association: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
        ],
        limit,
        offset,
        order: [['timestamp', 'DESC']],
      });

      return logs;
    } catch (error) {
      logger.error(`Get all audit logs error: ${error.message}`);
      throw error;
    }
  }

  // Get audit logs by table
  static async getTableAuditLogs(tableName, limit = 50, offset = 0) {
    try {
      const logs = await AuditLog.findAll({
        where: { table_name: tableName },
        limit,
        offset,
        order: [['timestamp', 'DESC']],
      });

      return logs;
    } catch (error) {
      logger.error(`Get table audit logs error: ${error.message}`);
      throw error;
    }
  }
}

export default AuditService;
