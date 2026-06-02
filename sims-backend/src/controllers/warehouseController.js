import { Warehouse, User, Inventory, Product, AuditLog } from '../models/index.js';
import logger from '../config/logger.js';
import { Op } from 'sequelize';

export class WarehouseController {
  // Get all warehouses with utilization
  static async getAllWarehouses(req, res, next) {
    try {
      const warehouses = await Warehouse.findAll({
        include: [
          {
            association: 'manager',
            attributes: ['user_id', 'full_name', 'email'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      // Calculate utilization percentage for each warehouse
      const warehousesWithUtil = warehouses.map(w => ({
        ...w.toJSON(),
        utilization_percent: (w.current_usage / w.capacity) * 100,
        manager_name: w.manager?.full_name || 'Unassigned',
      }));

      res.status(200).json({
        success: true,
        data: warehousesWithUtil,
        count: warehousesWithUtil.length,
      });
    } catch (error) {
      logger.error(`Get warehouses error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get warehouse by ID with top products
  static async getWarehouseById(req, res, next) {
    try {
      const { id } = req.params;
      const warehouse = await Warehouse.findByPk(id, {
        include: [
          {
            association: 'manager',
            attributes: ['user_id', 'full_name', 'email'],
          },
        ],
      });

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          error: 'Warehouse not found',
        });
      }

      // Get top 10 products in this warehouse
      const topProducts = await Inventory.findAll({
        where: { warehouse_id: id },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'sku', 'name', 'category'],
          },
        ],
        order: [['quantity', 'DESC']],
        limit: 10,
      });

      const warehouseData = warehouse.toJSON();
      warehouseData.utilization_percent = (warehouse.current_usage / warehouse.capacity) * 100;
      warehouseData.manager_name = warehouse.manager?.full_name || 'Unassigned';
      warehouseData.top_products = topProducts.map(inv => ({
        inventory_id: inv.inventory_id,
        product_id: inv.product_id,
        product_name: inv.product?.name,
        sku: inv.product?.sku,
        quantity: inv.quantity,
        location: inv.location,
      }));

      res.status(200).json({
        success: true,
        data: warehouseData,
      });
    } catch (error) {
      logger.error(`Get warehouse error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create warehouse with audit log
  static async createWarehouse(req, res, next) {
    try {
      const {
        name,
        location,
        address,
        capacity,
        manager_id,
      } = req.body;

      // Check if warehouse name already exists
      const existingWarehouse = await Warehouse.findOne({ where: { name } });
      if (existingWarehouse) {
        return res.status(400).json({
          success: false,
          error: 'Warehouse with this name already exists',
        });
      }

      const warehouse = await Warehouse.create({
        name,
        location,
        address,
        capacity,
        manager_id,
      });

      // Create audit log
      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'CREATE_WAREHOUSE',
        table_name: 'warehouses',
        record_id: warehouse.warehouse_id,
        changes: JSON.stringify({
          name,
          location,
          address,
          capacity,
          manager_id,
        }),
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      logger.info(`Warehouse created: ${name} by user ${req.user.user_id}`);

      res.status(201).json({
        success: true,
        data: warehouse,
      });
    } catch (error) {
      logger.error(`Create warehouse error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update warehouse with audit log
  static async updateWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const warehouse = await Warehouse.findByPk(id);

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          error: 'Warehouse not found',
        });
      }

      // Store old values for audit log
      const oldValues = warehouse.toJSON();

      await warehouse.update(updateData);

      // Create audit log
      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'UPDATE_WAREHOUSE',
        table_name: 'warehouses',
        record_id: warehouse.warehouse_id,
        changes: JSON.stringify({
          before: oldValues,
          after: updateData,
        }),
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      logger.info(`Warehouse updated: ${warehouse.name} by user ${req.user.user_id}`);

      res.status(200).json({
        success: true,
        data: warehouse,
      });
    } catch (error) {
      logger.error(`Update warehouse error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Delete warehouse with stock check and audit log
  static async deleteWarehouse(req, res, next) {
    try {
      const { id } = req.params;

      const warehouse = await Warehouse.findByPk(id);

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          error: 'Warehouse not found',
        });
      }

      // Check if warehouse has any stock
      const stockCount = await Inventory.count({
        where: {
          warehouse_id: id,
          quantity: { [Op.gt]: 0 },
        },
      });

      if (stockCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Warehouse contains ${stockCount} items. Please transfer all items before deleting.`,
        });
      }

      const warehouseName = warehouse.name;
      await warehouse.destroy();

      // Create audit log
      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'DELETE_WAREHOUSE',
        table_name: 'warehouses',
        record_id: id,
        changes: JSON.stringify({
          deleted_warehouse: warehouseName,
        }),
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      logger.info(`Warehouse deleted: ${warehouseName} by user ${req.user.user_id}`);

      res.status(200).json({
        success: true,
        message: 'Warehouse deleted successfully',
      });
    } catch (error) {
      logger.error(`Delete warehouse error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get warehouse capacity usage with products
  static async getCapacityUsage(req, res, next) {
    try {
      const { id } = req.params;

      const warehouse = await Warehouse.findByPk(id, {
        include: [
          {
            association: 'manager',
            attributes: ['user_id', 'full_name'],
          },
        ],
      });

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          error: 'Warehouse not found',
        });
      }

      const usagePercentage = (warehouse.current_usage / warehouse.capacity) * 100;

      // Get all products in this warehouse
      const products = await Inventory.findAll({
        where: { warehouse_id: id },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'sku', 'name'],
          },
        ],
        order: [['quantity', 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: {
          warehouse_id: warehouse.warehouse_id,
          name: warehouse.name,
          location: warehouse.location,
          capacity: warehouse.capacity,
          current_usage: warehouse.current_usage,
          available_space: warehouse.capacity - warehouse.current_usage,
          utilization_percent: usagePercentage.toFixed(2),
          manager_name: warehouse.manager?.full_name || 'Unassigned',
          products: products.map(inv => ({
            inventory_id: inv.inventory_id,
            product_id: inv.product_id,
            product_name: inv.product?.name,
            sku: inv.product?.sku,
            quantity: inv.quantity,
            location: inv.location,
          })),
        },
      });
    } catch (error) {
      logger.error(`Get capacity usage error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get managers for dropdown
  static async getManagers(req, res, next) {
    try {
      const managers = await User.findAll({
        where: {
          role: { [Op.in]: ['admin', 'manager'] },
          status: 'active',
        },
        attributes: ['user_id', 'full_name', 'email', 'role'],
        order: [['full_name', 'ASC']],
      });

      res.status(200).json({
        success: true,
        data: managers,
        count: managers.length,
      });
    } catch (error) {
      logger.error(`Get managers error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default WarehouseController;
