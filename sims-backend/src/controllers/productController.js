import { Op } from 'sequelize';
import {
  Product,
  Inventory,
  Warehouse,
  AuditLog,
  PurchaseOrder,
  ProductCategory,
  User,
  sequelize,
} from '../models/index.js';
import logger from '../config/logger.js';

/* ── helpers ─────────────────────────────────────────── */
const userId = (req) => req.user?.user_id || req.user?.id;

async function getManagedWarehouseIds(req) {
  const { role } = req.user;
  const uid = userId(req);
  if (role === 'admin') return null; // no filter
  const warehouses = await Warehouse.findAll({
    where: { manager_id: uid },
    attributes: ['warehouse_id'],
  });
  return warehouses.length ? warehouses.map((w) => w.warehouse_id) : null;
}

/* ══════════════════════════════════════════════════════
   GET /api/products
══════════════════════════════════════════════════════ */
export async function getProducts(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { search, category, status } = req.query;

    // Build where clause
    const where = {};

    // Active / inactive filter
    if (status === 'inactive') {
      where.is_active = false;
    } else if (status === 'active' || !status) {
      where.is_active = true;
    }
    // status === 'all' → no filter

    if (search) {
      where[Op.or] = [
        { name:    { [Op.like]: `%${search}%` } },
        { sku:     { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    // Warehouse scope for manager/staff
    const warehouseIds = await getManagedWarehouseIds(req);
    const invWhere = warehouseIds
      ? { warehouse_id: { [Op.in]: warehouseIds } }
      : {};

    const { count: total, rows: products } = await Product.unscoped().findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
      include: [
        {
          model: Inventory,
          as: 'inventory',
          attributes: ['quantity'],
          where: Object.keys(invWhere).length ? invWhere : undefined,
          required: false,
        },
      ],
    });

    const data = products.map((p) => {
      const json = p.toJSON();
      json.totalStock = (json.inventory || []).reduce((s, i) => s + (i.quantity || 0), 0);
      // Derive stock status
      if (json.totalStock === 0) json.stockStatus = 'out_of_stock';
      else if (json.totalStock <= json.reorder_level) json.stockStatus = 'low_stock';
      else json.stockStatus = 'in_stock';
      delete json.inventory; // don't bloat list response
      return json;
    });

    return res.json({
      success: true,
      data: {
        products: data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    logger.error(`getProducts: ${err.message}`);
    next(err);
  }
}

/* ══════════════════════════════════════════════════════
   GET /api/products/:id
   Full product detail with inventory breakdown, PO history, audit log
══════════════════════════════════════════════════════ */
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const warehouseIds = await getManagedWarehouseIds(req);
    const invWhere = warehouseIds
      ? { warehouse_id: { [Op.in]: warehouseIds } }
      : {};

    const product = await Product.unscoped().findByPk(id, {
      include: [
        {
          model: Inventory,
          as: 'inventory',
          where: Object.keys(invWhere).length ? invWhere : undefined,
          required: false,
          attributes: [
            'id', 'warehouse_id', 'quantity', 'reorder_level',
            'batch_no', 'expiry_date', 'location', 'status',
            'stock_value', 'updated_at',
          ],
          include: [
            {
              model: Warehouse,
              as: 'warehouse',
              attributes: ['warehouse_id', 'name', 'location'],
            },
          ],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Total stock summary
    const json = product.toJSON();
    json.totalStock = (json.inventory || []).reduce((s, i) => s + (i.quantity || 0), 0);
    json.totalStockValue = (json.inventory || []).reduce(
      (s, i) => s + (parseFloat(i.stock_value) || 0), 0,
    );

    // Purchase order history (last 10 POs that contain this product)
    const poHistory = await sequelize.query(
      `SELECT po.po_id, po.po_number, po.status, po.order_date,
              po.total_amount, po.created_at,
              s.name AS supplier_name
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.supplier_id
       WHERE JSON_SEARCH(po.items, 'one', :pid, NULL, '$[*].product_id') IS NOT NULL
       ORDER BY po.created_at DESC
       LIMIT 10`,
      {
        replacements: { pid: String(id) },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    // Audit log for this product (last 20)
    const auditLogs = await AuditLog.findAll({
      where: { table_name: 'products' },
      order: [['timestamp', 'DESC']],
      limit: 20,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    // Filter to logs that mention this product_id
    const productAuditLogs = auditLogs
      .filter((log) => {
        try {
          const c = log.changes || {};
          return (
            JSON.stringify(c).includes(`"product_id":${id}`) ||
            JSON.stringify(c).includes(`"id":${id}`) ||
            (c.new && c.new.product_id == id) ||
            (c.deleted && c.deleted.product_id == id)
          );
        } catch {
          return false;
        }
      })
      .map((log) => {
        const u = log.user;
        return {
          log_id:    log.log_id,
          action:    log.action,
          user:      u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : 'System',
          timestamp: log.timestamp,
          changes:   log.changes,
        };
      });

    return res.json({
      success: true,
      data: {
        ...json,
        purchaseHistory: poHistory,
        auditLog:        productAuditLogs,
      },
    });
  } catch (err) {
    logger.error(`getProductById: ${err.message}`);
    next(err);
  }
}

/* ══════════════════════════════════════════════════════
   POST /api/products
══════════════════════════════════════════════════════ */
export async function createProduct(req, res, next) {
  try {
    const body = req.validatedBody || req.body;
    const {
      sku, name, description, category, unit,
      reorder_level, reorder_qty, unit_price, cost_price,
      barcode, image_url, is_active = true,
    } = body;

    const existing = await Product.unscoped().findOne({ where: { sku } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A product with this SKU already exists' });
    }

    if (barcode) {
      const dupBarcode = await Product.unscoped().findOne({ where: { barcode } });
      if (dupBarcode) {
        return res.status(409).json({ success: false, error: 'Barcode is already assigned to another product' });
      }
    }

    // Ensure category exists in product_categories (upsert)
    await ProductCategory.findOrCreate({
      where: { name: category },
      defaults: { name: category, created_by: userId(req) },
    });

    const product = await Product.create({
      sku, name, description, category, unit,
      reorder_level, reorder_qty, unit_price, cost_price,
      barcode: barcode || null,
      image_url: image_url || null,
      is_active,
      created_by: userId(req),
    });

    await AuditLog.create({
      user_id:    userId(req),
      action:     'create',
      table_name: 'products',
      changes:    { new: product.toJSON() },
      ip_address: req.ip,
    });

    logger.info(`Product created: ${sku} by user ${userId(req)}`);

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    logger.error(`createProduct: ${err.message}`);
    next(err);
  }
}

/* ══════════════════════════════════════════════════════
   PUT /api/products/:id
══════════════════════════════════════════════════════ */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.validatedBody || req.body;

    const product = await Product.unscoped().findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // SKU uniqueness check (excluding self)
    if (body.sku && body.sku !== product.sku) {
      const dup = await Product.unscoped().findOne({ where: { sku: body.sku } });
      if (dup) {
        return res.status(409).json({ success: false, error: 'SKU already in use by another product' });
      }
    }

    // Barcode uniqueness
    if (body.barcode && body.barcode !== product.barcode) {
      const dupB = await Product.unscoped().findOne({
        where: { barcode: body.barcode, product_id: { [Op.ne]: id } },
      });
      if (dupB) {
        return res.status(409).json({ success: false, error: 'Barcode already assigned to another product' });
      }
    }

    // Ensure new category exists
    if (body.category && body.category !== product.category) {
      await ProductCategory.findOrCreate({
        where: { name: body.category },
        defaults: { name: body.category, created_by: userId(req) },
      });
    }

    const oldData = product.toJSON();
    await product.update(body);

    // Build a concise diff for the audit log
    const diff = {};
    for (const key of Object.keys(body)) {
      if (String(oldData[key]) !== String(product.dataValues[key])) {
        diff[key] = { old: oldData[key], new: product.dataValues[key] };
      }
    }

    await AuditLog.create({
      user_id:    userId(req),
      action:     'update',
      table_name: 'products',
      changes:    diff,
      ip_address: req.ip,
    });

    logger.info(`Product updated: ${product.sku} by user ${userId(req)}`);

    return res.json({ success: true, data: product });
  } catch (err) {
    logger.error(`updateProduct: ${err.message}`);
    next(err);
  }
}

/* ══════════════════════════════════════════════════════
   DELETE /api/products/:id  (soft delete — Admin only)
══════════════════════════════════════════════════════ */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    const product = await Product.unscoped().findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await product.update({ is_active: false });

    await AuditLog.create({
      user_id:    userId(req),
      action:     'delete',
      table_name: 'products',
      changes:    { deleted: { product_id: product.product_id, sku: product.sku, name: product.name } },
      ip_address: req.ip,
    });

    logger.info(`Product soft-deleted: ${product.sku} by user ${userId(req)}`);

    return res.json({ success: true, message: 'Product deactivated successfully' });
  } catch (err) {
    logger.error(`deleteProduct: ${err.message}`);
    next(err);
  }
}

/* ══════════════════════════════════════════════════════
   GET /api/categories
══════════════════════════════════════════════════════ */
export async function getCategories(req, res, next) {
  try {
    // Return managed categories + any category strings on products not yet in the table
    const [managed, fromProducts] = await Promise.all([
      ProductCategory.findAll({ order: [['name', 'ASC']] }),
      Product.unscoped().findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
        where: { is_active: true },
        raw: true,
      }),
    ]);

    const managedNames = new Set(managed.map((c) => c.name));
    const extra = fromProducts
      .map((r) => r.category)
      .filter((n) => n && !managedNames.has(n))
      .map((name) => ({ id: null, name, description: null }));

    const all = [
      ...managed.map((c) => ({ id: c.id, name: c.name, description: c.description })),
      ...extra,
    ].sort((a, b) => a.name.localeCompare(b.name));

    return res.json({ success: true, data: all });
  } catch (err) {
    logger.error(`getCategories: ${err.message}`);
    next(err);
  }
}

/* ══════════════════════════════════════════════════════
   POST /api/categories
══════════════════════════════════════════════════════ */
export async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const [cat, created] = await ProductCategory.findOrCreate({
      where: { name: name.trim() },
      defaults: { name: name.trim(), description: description || null, created_by: userId(req) },
    });

    return res.status(created ? 201 : 200).json({
      success: true,
      data: cat,
      created,
    });
  } catch (err) {
    logger.error(`createCategory: ${err.message}`);
    next(err);
  }
}
