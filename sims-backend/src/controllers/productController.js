import { Op } from 'sequelize';
import { Product, AuditLog } from '../models/index.js';
import logger from '../config/logger.js';

export class ProductController {
  // Get products with pagination, search, category
  static async getProducts(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const { search, category } = req.query;

      const where = {};
      
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } },
        ];
      }
      
      if (category) {
        where.category = category;
      }

      const { count: total, rows: products } = await Product.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true,
        include: [
          {
            association: 'inventory',
            attributes: ['quantity'],
          },
        ],
      });

      // Calculate total stock for each product on the fly if needed
      const productsWithTotalStock = products.map(p => {
        const productData = p.toJSON();
        const totalStock = productData.inventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0;
        return { ...productData, totalStock };
      });

      res.status(200).json({
        success: true,
        data: {
          products: productsWithTotalStock,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
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
            include: [
              {
                association: 'warehouse',
                attributes: ['name'],
              },
            ],
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
      } = req.body; // or req.validatedBody if validate middleware passes it there

      const existingProduct = await Product.findOne({ where: { sku } });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          error: 'SKU already exists',
        });
      }

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

      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'create',
        table_name: 'products',
        changes: { new: product.toJSON() },
        ip_address: req.ip,
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
      const updateData = req.body; // or req.validatedBody

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      if (updateData.sku && updateData.sku !== product.sku) {
        const existingProduct = await Product.findOne({ where: { sku: updateData.sku } });
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            error: 'SKU already exists',
          });
        }
      }

      const oldData = product.toJSON();
      await product.update(updateData);

      const changes = {};
      for (const key in updateData) {
        if (oldData[key] !== product[key]) {
          changes[key] = { old: oldData[key], new: product[key] };
        }
      }

      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'update',
        table_name: 'products',
        changes,
        ip_address: req.ip,
      });

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
      
      const oldData = product.toJSON();

      await product.destroy();

      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'delete',
        table_name: 'products',
        changes: { deleted: oldData },
        ip_address: req.ip,
      });

      logger.info(`Product deleted: ${product.sku}`);

      res.status(200).json({
        success: true,
        message: 'Product deleted', // Matching requirement Exactly
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
