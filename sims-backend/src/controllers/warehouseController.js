import { Warehouse, User } from '../models/index.js';
import logger from '../config/logger.js';

export class WarehouseController {
  // Get all warehouses
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

      res.status(200).json({
        success: true,
        data: warehouses,
        count: warehouses.length,
      });
    } catch (error) {
      logger.error(`Get warehouses error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get warehouse by ID
  static async getWarehouseById(req, res, next) {
    try {
      const { id } = req.params;
      const warehouse = await Warehouse.findByPk(id, {
        include: [
          {
            association: 'manager',
            attributes: ['user_id', 'full_name', 'email'],
          },
          {
            association: 'inventory',
            attributes: ['inventory_id', 'product_id', 'quantity', 'batch_no', 'location'],
          },
        ],
      });

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          error: 'Warehouse not found',
        });
      }

      res.status(200).json({
        success: true,
        data: warehouse,
      });
    } catch (error) {
      logger.error(`Get warehouse error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create warehouse
  static async createWarehouse(req, res, next) {
    try {
      const {
        name,
        location,
        address,
        capacity,
        manager_id,
      } = req.body;

      const warehouse = await Warehouse.create({
        name,
        location,
        address,
        capacity,
        manager_id,
      });

      logger.info(`Warehouse created: ${name}`);

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

  // Update warehouse
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

      await warehouse.update(updateData);

      logger.info(`Warehouse updated: ${warehouse.name}`);

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

  // Delete warehouse
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

      await warehouse.destroy();

      logger.info(`Warehouse deleted: ${warehouse.name}`);

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

  // Get warehouse capacity usage
  static async getCapacityUsage(req, res, next) {
    try {
      const { id } = req.params;

      const warehouse = await Warehouse.findByPk(id);

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          error: 'Warehouse not found',
        });
      }

      const usagePercentage = (warehouse.current_usage / warehouse.capacity) * 100;

      res.status(200).json({
        success: true,
        data: {
          warehouse_id: warehouse.warehouse_id,
          name: warehouse.name,
          capacity: warehouse.capacity,
          current_usage: warehouse.current_usage,
          available_space: warehouse.capacity - warehouse.current_usage,
          usage_percentage: usagePercentage.toFixed(2),
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
}

export default WarehouseController;
