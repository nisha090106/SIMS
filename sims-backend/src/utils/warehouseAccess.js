import { Warehouse, User } from '../models/index.js';
import logger from '../config/logger.js';

export async function resolveManagedWarehouseIdsForUser(user, deps = {}) {
  const {
    warehouseModel = Warehouse,
    userModel = User,
    loggerInstance = logger,
    fallbackManagerEmail = 'manager@sims.com',
  } = deps;

  if (!user) return [];

  const role = user.role || user.user_role;
  if (!role || role === 'admin') return null;

  const userId = user.id ?? user.user_id ?? user.userId;

  if (role === 'staff' || role === 'manager') {
    const roleUser = user.warehouse_id != null
      ? { warehouse_id: user.warehouse_id }
      : await userModel.findByPk(userId, { attributes: ['warehouse_id'] });
    
    if (roleUser?.warehouse_id) {
      return [Number(roleUser.warehouse_id)];
    }
    // If manager doesn't have a direct warehouse_id, fallback to checking Warehouse table
    if (role === 'staff') return [];
  }

  const directWarehouses = await warehouseModel.findAll({
    where: { manager_id: userId },
    attributes: ['warehouse_id'],
  });

  if (directWarehouses?.length) {
    return directWarehouses.map((w) => Number(w.warehouse_id));
  }

  if (fallbackManagerEmail) {
    const fallbackManager = await userModel.findOne({
      where: { email: fallbackManagerEmail },
      attributes: ['id', 'email', 'role'],
    });

    if (fallbackManager?.id && Number(fallbackManager.id) !== Number(userId)) {
      const fallbackWarehouses = await warehouseModel.findAll({
        where: { manager_id: fallbackManager.id },
        attributes: ['warehouse_id'],
      });

      if (fallbackWarehouses?.length) {
        return fallbackWarehouses.map((w) => Number(w.warehouse_id));
      }
    }
  }

  loggerInstance.warn?.(`User ${userId || user.email || 'unknown'} has no assigned warehouses`);
  return [];
}
