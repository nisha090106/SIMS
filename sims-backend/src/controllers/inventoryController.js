import { Op } from 'sequelize';
import { Inventory, Product, Warehouse, AuditLog } from '../models/index.js';
import logger from '../config/logger.js';
import { sequelize } from '../models/index.js';

export class InventoryController {
  // Get inventory
  static async getInventory(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const { warehouse_id, search, status } = req.query;

      const where = {};
      const productWhere = {};

      if (warehouse_id) where.warehouse_id = warehouse_id;

      if (search) {
        productWhere[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } },
        ];
      }

      // Since status is derived (quantity vs product.reorder_level), we must fetch and filter if status is applied
      // But for pagination to work nicely at the DB level, we can use a raw query or Sequelize literal
      // Alternatively, we fetch all matching rows and filter in JS. 
      // To support DB-level pagination with status, we use Sequelize where literals.
      if (status === 'out') {
        where.quantity = 0;
      } else if (status === 'low') {
        where.quantity = {
          [Op.gt]: 0,
          [Op.lte]: sequelize.col('product.reorder_level'),
        };
      } else if (status === 'normal') {
        where.quantity = {
          [Op.gt]: sequelize.col('product.reorder_level'),
        };
      }

      const { count, rows } = await Inventory.findAndCountAll({
        where,
        limit,
        offset,
        distinct: true,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'sku', 'name', 'category', 'unit_price', 'reorder_level'],
            where: productWhere,
          },
          {
            model: Warehouse,
            as: 'warehouse',
            attributes: ['warehouse_id', 'name', 'location'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      const formattedInventory = rows.map((inv) => {
        const item = inv.toJSON();
        let itemStatus = 'normal';
        if (item.quantity === 0) itemStatus = 'out_of_stock';
        else if (item.quantity <= item.product.reorder_level) itemStatus = 'low_stock';

        return {
          id: item.inventory_id,
          product_id: item.product_id,
          product_name: item.product.name,
          sku: item.product.sku,
          category: item.product.category,
          unit_price: item.product.unit_price,
          warehouse_id: item.warehouse_id,
          warehouse_name: item.warehouse.name,
          quantity: item.quantity,
          reorder_level: item.product.reorder_level,
          status: itemStatus,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          inventory: formattedInventory,
          total: count,
          page,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      logger.error(`Get inventory error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get low stock
  static async getLowStock(req, res, next) {
    try {
      const lowStockItems = await Inventory.findAll({
        where: {
          quantity: {
            [Op.lte]: sequelize.col('product.reorder_level'),
          },
        },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'sku', 'name', 'category', 'unit_price', 'reorder_level'],
          },
          {
            model: Warehouse,
            as: 'warehouse',
            attributes: ['warehouse_id', 'name', 'location'],
          },
        ],
        limit: 50,
      });

      // Sort by (quantity - reorder_level) ASC in javascript since it's easier and limit is 50
      const formatted = lowStockItems.map(inv => inv.toJSON());
      formatted.sort((a, b) => {
        const aDiff = a.quantity - a.product.reorder_level;
        const bDiff = b.quantity - b.product.reorder_level;
        return aDiff - bDiff;
      });

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      logger.error(`Get low stock items error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get Inventory Summary
  static async getInventorySummary(req, res, next) {
    try {
      const allInventory = await Inventory.findAll({
        include: [
          { model: Product, as: 'product', attributes: ['product_id', 'unit_price', 'reorder_level'] },
          { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'name'] },
        ],
      });

      let totalItems = 0;
      let totalValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      const warehouseStats = {};

      allInventory.forEach(inv => {
        const i = inv.toJSON();
        const value = i.quantity * (i.product?.unit_price || 0);

        totalItems += i.quantity;
        totalValue += value;

        if (i.quantity === 0) outOfStockCount++;
        else if (i.quantity <= i.product?.reorder_level) lowStockCount++;

        const wId = i.warehouse_id;
        if (!warehouseStats[wId]) {
          warehouseStats[wId] = {
            warehouse_id: wId,
            warehouse_name: i.warehouse?.name || 'Unknown',
            totalQuantity: 0,
            totalValue: 0,
          };
        }
        warehouseStats[wId].totalQuantity += i.quantity;
        warehouseStats[wId].totalValue += value;
      });

      res.status(200).json({
        success: true,
        data: {
          totalItems,
          totalValue,
          lowStockCount,
          outOfStockCount,
          byWarehouse: Object.values(warehouseStats),
        },
      });
    } catch (error) {
      logger.error(`Get inventory summary error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update Stock
  static async updateStock(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity, reason } = req.body;

      if (quantity < 0) {
        return res.status(400).json({ success: false, error: 'Quantity must be >= 0' });
      }

      const inventory = await Inventory.findByPk(id);
      if (!inventory) {
        return res.status(404).json({ success: false, error: 'Inventory item not found' });
      }

      const oldQty = inventory.quantity;
      await inventory.update({ quantity });

      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'update',
        table_name: 'inventory',
        changes: { action: 'UPDATE_STOCK', inventory_id: id, oldQty, newQty: quantity, reason },
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      logger.error(`Update stock error: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // Transfer Stock
  static async transferStock(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { from_warehouse_id, to_warehouse_id, product_id, quantity, reason } = req.body;

      if (from_warehouse_id === to_warehouse_id) {
        throw new Error('Source and destination warehouses cannot be the same');
      }
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      const sourceInv = await Inventory.findOne({
        where: { product_id, warehouse_id: from_warehouse_id },
        transaction: t,
      });

      if (!sourceInv || sourceInv.quantity < quantity) {
        throw new Error('Insufficient stock in source warehouse');
      }

      let destInv = await Inventory.findOne({
        where: { product_id, warehouse_id: to_warehouse_id },
        transaction: t,
      });

      const oldSourceQty = sourceInv.quantity;
      const newSourceQty = sourceInv.quantity - quantity;
      await sourceInv.update({ quantity: newSourceQty }, { transaction: t });

      let oldDestQty = 0;
      let newDestQty = quantity;
      
      if (destInv) {
        oldDestQty = destInv.quantity;
        newDestQty = destInv.quantity + quantity;
        await destInv.update({ quantity: newDestQty }, { transaction: t });
      } else {
        destInv = await Inventory.create({
          product_id,
          warehouse_id: to_warehouse_id,
          quantity: newDestQty,
        }, { transaction: t });
      }

      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'update',
        table_name: 'inventory',
        changes: { 
          action: 'STOCK_TRANSFER',
          product_id,
          from_warehouse_id,
          to_warehouse_id,
          quantity,
          reason,
        },
        ip_address: req.ip,
      }, { transaction: t });

      await t.commit();

      res.status(200).json({
        success: true,
        data: {
          message: 'Stock transferred successfully',
          from: { warehouse: from_warehouse_id, newQty: newSourceQty },
          to: { warehouse: to_warehouse_id, newQty: newDestQty },
        },
      });
    } catch (error) {
      await t.rollback();
      logger.error(`Transfer stock error: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // Adjust Inventory
  static async adjustInventory(req, res, next) {
    try {
      const { inventory_id, adjustment_type, quantity, reason } = req.body;
      // adjustment_type: damage, return, correction
      
      const qtyToAdjust = parseFloat(quantity);
      if (!qtyToAdjust || qtyToAdjust === 0) {
        return res.status(400).json({ success: false, error: 'Invalid quantity' });
      }

      const inventory = await Inventory.findByPk(inventory_id);
      if (!inventory) {
        return res.status(404).json({ success: false, error: 'Inventory record not found' });
      }

      let newQty = inventory.quantity;
      
      if (adjustment_type === 'damage') {
        newQty -= Math.abs(qtyToAdjust);
      } else if (adjustment_type === 'return') {
        newQty += Math.abs(qtyToAdjust);
      } else if (adjustment_type === 'correction') {
        newQty += qtyToAdjust; // can be pos or neg
      } else {
        return res.status(400).json({ success: false, error: 'Invalid adjustment type' });
      }

      if (newQty < 0) newQty = 0; // prevent negative stock if adjusting too much

      const oldQty = inventory.quantity;
      await inventory.update({ quantity: newQty });

      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'update',
        table_name: 'inventory',
        changes: {
          action: 'STOCK_ADJUSTMENT',
          adjustment_type,
          inventory_id,
          oldQty,
          newQty,
          reason,
        },
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      logger.error(`Adjust stock error: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export default InventoryController;
