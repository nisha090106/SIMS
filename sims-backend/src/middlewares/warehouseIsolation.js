import { Warehouse } from '../models/index.js';
import { resolveManagedWarehouseIdsForUser } from '../utils/warehouseAccess.js';

export const warehouseIsolation = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { role, id: userId } = req.user;

    if (role === 'admin') {
      if (req.query.warehouseId) {
        req.allowedWarehouseIds = [parseInt(req.query.warehouseId)];
      } else {
        req.allowedWarehouseIds = null; // Admin has access to all warehouses
      }
      return next();
    }

    if (role === 'manager') {
      const managedIds = await resolveManagedWarehouseIdsForUser({
        id: userId,
        role,
        email: req.user?.email,
      });

      if (req.query.warehouseId) {
        const requestedId = parseInt(req.query.warehouseId);
        if (!managedIds.includes(requestedId)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: You do not manage this warehouse',
          });
        }
        req.allowedWarehouseIds = [requestedId];
      } else {
        req.allowedWarehouseIds = managedIds;
      }
      return next();
    }

    // Deny access or isolate to empty for other roles
    req.allowedWarehouseIds = [];
    return next();
  } catch (error) {
    next(error);
  }
};

export default warehouseIsolation;
