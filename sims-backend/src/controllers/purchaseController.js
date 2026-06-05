import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Inventory from '../models/Inventory.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/user.js';
import { Op } from 'sequelize';

/**
 * Get all purchase orders with pagination and filters
 * Query params: page, limit, status, supplier_id, date_from, date_to
 */
export const getPurchaseOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, supplier_id, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (supplier_id) {
      where.supplier_id = supplier_id;
    }

    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) {
        where.order_date[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.order_date[Op.lte] = new Date(date_to);
      }
    }

    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        {
          model: Supplier,
          attributes: ['supplier_id', 'name', 'contact_person', 'email'],
        },
      ],
      order: [['order_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.status(200).json({
      orders: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

/**
 * Get a single purchase order by ID
 */
export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await PurchaseOrder.findByPk(id, {
      include: [
        {
          model: Supplier,
          attributes: ['supplier_id', 'name', 'contact_person', 'email', 'phone', 'address'],
        },
      ],
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Parse items JSON if it's a string
    let items = [];
    if (po.items) {
      items = typeof po.items === 'string' ? JSON.parse(po.items) : po.items;
    }

    res.status(200).json({
      ...po.toJSON(),
      items,
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
};

/**
 * Create a new purchase order
 * Body: { supplier_id, expected_delivery, items: [{ product_id, quantity, unit_price }], notes }
 */
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_id, expected_delivery, items, notes } = req.body;
    const user_id = req.user.user_id;

    // Validate inputs
    if (!supplier_id || !expected_delivery || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify supplier exists
    const supplier = await Supplier.findByPk(supplier_id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Verify products exist and calculate total
    let total_amount = 0;
    const itemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.product_id} not found` });
      }

      const subtotal = item.quantity * item.unit_price;
      total_amount += subtotal;
      itemsData.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal,
      });
    }

    // Generate PO number
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const po_number = `PO-${dateStr}-${random}`;

    // Create PO
    const newPO = await PurchaseOrder.create({
      po_number,
      supplier_id,
      order_date: new Date(),
      expected_delivery: new Date(expected_delivery),
      items: JSON.stringify(itemsData),
      notes: notes || null,
      total_amount,
      status: 'pending',
    });

    // Audit log
    await AuditLog.create({
      user_id,
      action: 'CREATE_PURCHASE_ORDER',
      table_name: 'purchase_orders',
      record_id: newPO.purchase_order_id,
      changes: JSON.stringify({
        po_number,
        supplier_id,
        total_amount,
        items: itemsData,
      }),
      ip_address: req.ip,
    });

    res.status(201).json({
      message: 'Purchase order created successfully',
      po: newPO,
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
};

/**
 * Update a purchase order (only when status = 'pending')
 */
export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { expected_delivery, items, notes } = req.body;
    const user_id = req.user.user_id;

    const po = await PurchaseOrder.findByPk(id);
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Only allow updates if status is pending
    if (po.status !== 'pending') {
      return res.status(400).json({ error: 'Can only update purchase orders in pending status' });
    }

    // Store old data for audit
    const oldData = {
      expected_delivery: po.expected_delivery,
      items: po.items,
      notes: po.notes,
    };

    // Calculate new total if items provided
    let total_amount = po.total_amount;
    let itemsData = [];

    if (items && items.length > 0) {
      total_amount = 0;

      for (const item of items) {
        const product = await Product.findByPk(item.product_id);
        if (!product) {
          return res.status(404).json({ error: `Product ${item.product_id} not found` });
        }

        const subtotal = item.quantity * item.unit_price;
        total_amount += subtotal;
        itemsData.push({
          product_id: item.product_id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal,
        });
      }

      po.items = JSON.stringify(itemsData);
      po.total_amount = total_amount;
    }

    if (expected_delivery) {
      po.expected_delivery = new Date(expected_delivery);
    }

    if (notes !== undefined) {
      po.notes = notes;
    }

    await po.save();

    // Audit log
    await AuditLog.create({
      user_id,
      action: 'UPDATE_PURCHASE_ORDER',
      table_name: 'purchase_orders',
      record_id: id,
      changes: JSON.stringify({
        before: oldData,
        after: {
          expected_delivery: po.expected_delivery,
          items: itemsData.length > 0 ? itemsData : oldData.items,
          notes: po.notes,
        },
      }),
      ip_address: req.ip,
    });

    res.status(200).json({
      message: 'Purchase order updated successfully',
      po,
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
};

/**
 * Approve a purchase order (pending → approved)
 * Admin only
 */
export const approvePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id;

    const po = await PurchaseOrder.findByPk(id);
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (po.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending purchase orders can be approved' });
    }

    const oldStatus = po.status;
    po.status = 'approved';
    await po.save();

    // Audit log
    await AuditLog.create({
      user_id,
      action: 'APPROVE_PURCHASE_ORDER',
      table_name: 'purchase_orders',
      record_id: id,
      changes: JSON.stringify({
        status: { from: oldStatus, to: 'approved' },
      }),
      ip_address: req.ip,
    });

    res.status(200).json({
      message: 'Purchase order approved successfully',
      po,
    });
  } catch (error) {
    console.error('Error approving purchase order:', error);
    res.status(500).json({ error: 'Failed to approve purchase order' });
  }
};

/**
 * Receive a purchase order (approved → received)
 * Updates inventory for each item
 * Body: { warehouse_id, received_items: [{ product_id, quantity_received }] }
 */
export const receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_id, received_items } = req.body;
    const user_id = req.user.user_id;

    const po = await PurchaseOrder.findByPk(id);
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (po.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved purchase orders can be received' });
    }

    if (!warehouse_id || !received_items || received_items.length === 0) {
      return res.status(400).json({ error: 'warehouse_id and received_items are required' });
    }

    // Update inventory for each received item
    for (const item of received_items) {
      const inventory = await Inventory.findOne({
        where: {
          product_id: item.product_id,
          warehouse_id,
        },
      });

      if (!inventory) {
        // Create new inventory record
        await Inventory.create({
          product_id: item.product_id,
          warehouse_id,
          quantity: item.quantity_received,
          last_restocked: new Date(),
        });
      } else {
        // Update existing inventory
        inventory.quantity += item.quantity_received;
        inventory.last_restocked = new Date();
        await inventory.save();
      }
    }

    // Update PO status
    const oldStatus = po.status;
    po.status = 'received';
    await po.save();

    // Audit log
    await AuditLog.create({
      user_id,
      action: 'RECEIVE_PURCHASE_ORDER',
      table_name: 'purchase_orders',
      record_id: id,
      changes: JSON.stringify({
        status: { from: oldStatus, to: 'received' },
        warehouse_id,
        received_items,
      }),
      ip_address: req.ip,
    });

    res.status(200).json({
      message: 'Purchase order received successfully',
      po,
    });
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    res.status(500).json({ error: 'Failed to receive purchase order' });
  }
};

/**
 * Cancel a purchase order (only if not received)
 * Admin only
 */
export const cancelPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id;

    const po = await PurchaseOrder.findByPk(id);
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (po.status === 'received' || po.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel received or already cancelled purchase orders' });
    }

    const oldStatus = po.status;
    po.status = 'cancelled';
    await po.save();

    // Audit log
    await AuditLog.create({
      user_id,
      action: 'CANCEL_PURCHASE_ORDER',
      table_name: 'purchase_orders',
      record_id: id,
      changes: JSON.stringify({
        status: { from: oldStatus, to: 'cancelled' },
      }),
      ip_address: req.ip,
    });

    res.status(200).json({
      message: 'Purchase order cancelled successfully',
      po,
    });
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    res.status(500).json({ error: 'Failed to cancel purchase order' });
  }
};
