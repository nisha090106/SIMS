import { Inventory, Product, Warehouse } from '../models/index.js';
import logger from '../config/logger.js';
import { sequelize } from '../models/index.js';

export class InventoryController {
  // Get all inventory items
  static async getAllInventory(req, res, next) {
    try {
      const { warehouseId, productId } = req.query;
      const where = {};

      if (warehouseId) where.warehouse_id = warehouseId;
      if (productId) where.product_id = productId;

      const inventory = await Inventory.findAll({
        where,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'sku', 'name', 'unit_price', 'reorder_level'],
          },
          {
            model: Warehouse,
            as: 'warehouse',
            attributes: ['warehouse_id', 'name', 'location'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: inventory,
        count: inventory.length,
      });
    } catch (error) {
      logger.error(`Get inventory error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get inventory by ID
  static async getInventoryById(req, res, next) {
    try {
      const { id } = req.params;

      const inventory = await Inventory.findByPk(id, {
        include: [
          {
            model: Product,
            as: 'product',
          },
          {
            model: Warehouse,
            as: 'warehouse',
          },
        ],
      });

      if (!inventory) {
        return res.status(404).json({
          success: false,
          error: 'Inventory item not found',
        });
      }

      res.status(200).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      logger.error(`Get inventory item error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create inventory item
  static async createInventory(req, res, next) {
    try {
      const {
        product_id,
        warehouse_id,
        quantity,
        batch_no,
        expiry_date,
        location,
      } = req.body;

      const inventory = await Inventory.create({
        product_id,
        warehouse_id,
        quantity,
        batch_no,
        expiry_date,
        location,
      });

      logger.info(`Inventory item created: Product ${product_id} in Warehouse ${warehouse_id}`);

      res.status(201).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      logger.error(`Create inventory error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update inventory quantity
  static async updateInventory(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity, batch_no, expiry_date, location } = req.body;

      const inventory = await Inventory.findByPk(id);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          error: 'Inventory item not found',
        });
      }

      await inventory.update({ quantity, batch_no, expiry_date, location });

      logger.info(`Inventory updated: ID ${id}`);

      res.status(200).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      logger.error(`Update inventory error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get low stock items
  static async getLowStockItems(req, res, next) {
    try {
      const lowStockItems = await sequelize.query(
        `SELECT 
          i.inventory_id,
          p.product_id,
          p.sku,
          p.name,
          p.reorder_level,
          p.reorder_qty,
          i.quantity,
          w.name as warehouse_name
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        JOIN warehouses w ON i.warehouse_id = w.warehouse_id
        WHERE i.quantity <= p.reorder_level
        ORDER BY i.quantity ASC`,
        { type: sequelize.QueryTypes.SELECT }
      );

      res.status(200).json({
        success: true,
        data: lowStockItems,
        count: lowStockItems.length,
      });
    } catch (error) {
      logger.error(`Get low stock items error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get inventory value summary
  static async getInventorySummary(req, res, next) {
    try {
      const summary = await sequelize.query(
        `SELECT 
          COUNT(DISTINCT i.inventory_id) as total_items,
          COUNT(DISTINCT p.product_id) as unique_products,
          SUM(i.quantity) as total_quantity,
          SUM(i.quantity * p.unit_price) as total_value,
          COUNT(DISTINCT i.warehouse_id) as warehouses_used
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id`,
        { type: sequelize.QueryTypes.SELECT }
      );

      res.status(200).json({
        success: true,
        data: summary[0],
      });
    } catch (error) {
      logger.error(`Get inventory summary error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default InventoryController;
