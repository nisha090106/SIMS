import { Product } from '../models/index.js';
import logger from '../config/logger.js';

export class ProductController {
  // Get all products
  static async getAllProducts(req, res, next) {
    try {
      const products = await Product.findAll({
        order: [['created_at', 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      logger.error(`Get products error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get product by ID
  static async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await Product.findByPk(id, {
        include: [
          {
            association: 'inventory',
            attributes: ['inventory_id', 'warehouse_id', 'quantity', 'batch_no', 'expiry_date', 'location'],
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error(`Get product error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create product
  static async createProduct(req, res, next) {
    try {
      const {
        sku,
        name,
        description,
        category,
        unit,
        reorder_level,
        reorder_qty,
        unit_price,
      } = req.body;

      const product = await Product.create({
        sku,
        name,
        description,
        category,
        unit,
        reorder_level,
        reorder_qty,
        unit_price,
      });

      logger.info(`Product created: ${sku}`);

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error(`Create product error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update product
  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      await product.update(updateData);

      logger.info(`Product updated: ${product.sku}`);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error(`Update product error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Delete product
  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      await product.destroy();

      logger.info(`Product deleted: ${product.sku}`);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      logger.error(`Delete product error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default ProductController;
