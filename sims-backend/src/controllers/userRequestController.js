import { Op } from 'sequelize';
import sequelize, {
  UserRequest,
  UserRequestItem,
  Product,
  Inventory,
  User,
  AuditLog,
} from '../models/index.js';
import NotificationService from '../services/notificationService.js';

/**
 * GET /api/catalog
 * Browse active products and stock status without exact pricing/quantity (User, Staff, Manager, Admin)
 */
export const getProductCatalog = async (req, res) => {
  try {
    const { search, category, availability, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

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

    // Retrieve products along with inventory levels to compute status
    const products = await Product.findAll({
      where,
      include: [{
        model: Inventory,
        as: 'inventory',
        attributes: ['quantity'],
      }],
    });

    const mappedProducts = products.map(product => {
      const totalQty = product.inventory ? product.inventory.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
      
      let availability_status = 'in_stock';
      if (totalQty === 0) {
        availability_status = 'out_of_stock';
      } else if (totalQty <= (product.reorder_level || 10)) {
        availability_status = 'low_stock';
      }

      return {
        id: product.product_id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        description: product.description,
        unit: product.unit,
        availability_status,
      };
    });

    // Filter by availability status if query param is set
    let filteredProducts = mappedProducts;
    if (availability) {
      filteredProducts = mappedProducts.filter(p => p.availability_status === availability);
    }

    const total = filteredProducts.length;
    const paginated = filteredProducts.slice(offset, offset + parseInt(limit));

    return res.status(200).json({
      success: true,
      data: paginated,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching product catalog:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch product catalog' });
  }
};

/**
 * POST /api/requests
 * Submit a new request for items (User, Staff)
 */
export const createRequest = async (req, res) => {
  try {
    const { purpose, department, items } = req.body;
    const userId = req.user.id || req.user.user_id;

    if (!purpose || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'purpose and a non-empty items array are required',
      });
    }

    // Validate all items exist and are not discontinued
    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product) {
        return res.status(404).json({ success: false, error: `Product ID ${item.product_id} not found` });
      }

      // Check if any inventory item for this product is discontinued
      const inventoryList = await Inventory.findAll({ where: { product_id: item.product_id } });
      const isDiscontinued = inventoryList.some(inv => inv.status === 'discontinued');
      if (isDiscontinued) {
        return res.status(400).json({
          success: false,
          error: `Product '${product.name}' (ID: ${item.product_id}) is discontinued and cannot be requested`,
        });
      }
    }

    // Generate request number: REQ-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const request_number = `REQ-${dateStr}-${random}`;

    // Create UserRequest inside a transaction
    const newRequest = await sequelize.transaction(async (t) => {
      const createdRequest = await UserRequest.create({
        request_number,
        requested_by: userId,
        department: department || null,
        purpose,
        status: 'pending',
      }, { transaction: t });

      const itemRecords = items.map(item => ({
        request_id: createdRequest.id,
        product_id: item.product_id,
        quantity_requested: item.quantity_requested,
        notes: item.notes || null,
      }));

      await UserRequestItem.bulkCreate(itemRecords, { transaction: t });
      return createdRequest;
    });

    // Fetch the created request with its items
    const fullRequest = await UserRequest.findByPk(newRequest.id, {
      include: [{
        model: UserRequestItem,
        as: 'items',
        include: [{ model: Product, as: 'product', attributes: ['name'] }],
      }],
    });

    // Notify all admin and manager users
    const requester = await User.findByPk(userId);
    const requesterName = requester ? `${requester.first_name || ''} ${requester.last_name || ''}`.trim() : 'User';
    
    const managersAndAdmins = await User.findAll({
      where: { role: { [Op.in]: ['admin', 'manager'] } },
    });

    for (const approver of managersAndAdmins) {
      await NotificationService.createNotification({
        type: 'new_user_request',
        message: `New request [${request_number}] submitted by ${requesterName}`,
        product_id: null,
        warehouse_id: null,
        current_quantity: null,
        reorder_level: null,
      });
    }

    return res.status(201).json({
      success: true,
      data: fullRequest,
    });
  } catch (error) {
    console.error('Error creating user request:', error);
    return res.status(500).json({ success: false, error: 'Failed to create user request' });
  }
};

/**
 * GET /api/requests/my
 * Retrieve requests placed by the logged-in requester (User, Staff)
 */
export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { requested_by: userId };
    if (status) {
      where.status = status;
    }

    const { count, rows } = await UserRequest.findAndCountAll({
      where,
      include: [
        {
          model: UserRequestItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['name', 'unit', 'sku'] }],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['first_name', 'last_name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching my requests:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch my requests' });
  }
};

/**
 * GET /api/requests/:id
 * Retrieve a request by ID. User/staff can only view their own; admin/manager can view any (User, Staff, Admin, Manager)
 */
export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.user_id;
    const userRole = req.user.role;

    const userRequest = await UserRequest.findByPk(id, {
      include: [
        {
          model: UserRequestItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['name', 'unit', 'sku'] }],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['first_name', 'last_name', 'email'],
        },
      ],
    });

    if (!userRequest) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    // Role verification
    if (userRole === 'user' || userRole === 'staff') {
      if (userRequest.requested_by !== userId) {
        return res.status(403).json({ success: false, error: 'You do not have permission to view this request' });
      }
    }

    return res.status(200).json({
      success: true,
      data: userRequest,
    });
  } catch (error) {
    console.error('Error fetching request by ID:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch request' });
  }
};

/**
 * PATCH /api/requests/:id/cancel
 * Cancel a pending request owned by requester (User, Staff)
 */
export const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.user_id;

    const userRequest = await UserRequest.findByPk(id);
    if (!userRequest) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    if (userRequest.requested_by !== userId) {
      return res.status(403).json({ success: false, error: 'You can only cancel your own requests' });
    }

    if (userRequest.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending requests can be cancelled' });
    }

    userRequest.status = 'cancelled';
    await userRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Request cancelled successfully',
      data: userRequest,
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    return res.status(500).json({ success: false, error: 'Failed to cancel request' });
  }
};

/**
 * GET /api/requests
 * Get all requests (Admin, Manager)
 */
export const getAllRequests = async (req, res) => {
  try {
    const { status, requested_by, department, date_from, date_to, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (requested_by) {
      where.requested_by = requested_by;
    }
    if (department) {
      where.department = department;
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        where.created_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.created_at[Op.lte] = new Date(date_to);
      }
    }

    const { count, rows } = await UserRequest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['first_name', 'last_name', 'email'],
        },
        {
          model: UserRequestItem,
          as: 'items',
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const mapped = rows.map(r => {
      const requesterName = r.requester ? `${r.requester.first_name || ''} ${r.requester.last_name || ''}`.trim() : 'Unknown';
      const itemCount = r.items ? r.items.length : 0;
      const totalItems = r.items ? r.items.reduce((sum, item) => sum + (item.quantity_requested || 0), 0) : 0;

      return {
        ...r.toJSON(),
        requester_name: requesterName,
        item_count: itemCount,
        total_items: totalItems,
      };
    });

    return res.status(200).json({
      success: true,
      data: mapped,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching all requests:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
};

/**
 * PATCH /api/requests/:id/approve
 * Approve request (Admin, Manager)
 */
export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_notes } = req.body;
    const reviewerId = req.user.id || req.user.user_id;

    const userRequest = await UserRequest.findByPk(id);
    if (!userRequest) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    if (userRequest.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending requests can be approved' });
    }

    userRequest.status = 'approved';
    userRequest.reviewed_by = reviewerId;
    userRequest.reviewed_at = new Date();
    if (review_notes !== undefined) {
      userRequest.review_notes = review_notes;
    }

    await userRequest.save();

    // Notify requester
    const requester = await User.findByPk(userRequest.requested_by);
    if (requester) {
      await NotificationService.createNotification({
        type: 'request_approved',
        message: `Your request [${userRequest.request_number}] has been approved`,
        product_id: null,
        warehouse_id: null,
        current_quantity: null,
        reorder_level: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Request approved successfully',
      data: userRequest,
    });
  } catch (error) {
    console.error('Error approving request:', error);
    return res.status(500).json({ success: false, error: 'Failed to approve request' });
  }
};

/**
 * PATCH /api/requests/:id/reject
 * Reject request (Admin, Manager)
 */
export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_notes } = req.body;
    const reviewerId = req.user.id || req.user.user_id;

    if (!review_notes) {
      return res.status(400).json({
        success: false,
        error: 'review_notes (reason for rejection) is required',
      });
    }

    const userRequest = await UserRequest.findByPk(id);
    if (!userRequest) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    if (userRequest.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending requests can be rejected' });
    }

    userRequest.status = 'rejected';
    userRequest.reviewed_by = reviewerId;
    userRequest.reviewed_at = new Date();
    userRequest.review_notes = review_notes;

    await userRequest.save();

    // Notify requester
    const requester = await User.findByPk(userRequest.requested_by);
    if (requester) {
      await NotificationService.createNotification({
        type: 'request_rejected',
        message: `Your request [${userRequest.request_number}] has been rejected. Reason: ${review_notes}`,
        product_id: null,
        warehouse_id: null,
        current_quantity: null,
        reorder_level: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Request rejected successfully',
      data: userRequest,
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    return res.status(500).json({ success: false, error: 'Failed to reject request' });
  }
};

/**
 * PATCH /api/requests/:id/fulfill
 * Fulfill approved request and deduct stock (Admin, Manager)
 */
export const fulfillRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_id, fulfilled_items } = req.body;
    const reviewerId = req.user.id || req.user.user_id;

    if (!warehouse_id || !fulfilled_items || !Array.isArray(fulfilled_items) || fulfilled_items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'warehouse_id and fulfilled_items are required',
      });
    }

    const userRequest = await UserRequest.findByPk(id, {
      include: [{ model: UserRequestItem, as: 'items' }],
    });

    if (!userRequest) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    if (userRequest.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Only approved requests can be fulfilled',
      });
    }

    // Perform updates in a Sequelize transaction
    await sequelize.transaction(async (t) => {
      for (const fItem of fulfilled_items) {
        const reqItem = userRequest.items.find(item => item.id === fItem.request_item_id);
        if (!reqItem) {
          throw new Error(`Request item ID ${fItem.request_item_id} does not belong to this request`);
        }

        const qtyToFulfill = parseInt(fItem.quantity_fulfilled);
        if (isNaN(qtyToFulfill) || qtyToFulfill < 0) {
          throw new Error(`Invalid quantity to fulfill for item ID ${fItem.request_item_id}`);
        }

        // Find and validate stock
        const inventory = await Inventory.findOne({
          where: { product_id: reqItem.product_id, warehouse_id },
          transaction: t,
        });

        if (!inventory || (inventory.quantity || 0) < qtyToFulfill) {
          throw new Error(`Insufficient stock in warehouse for Product ID ${reqItem.product_id}`);
        }

        // Deduct stock and save
        inventory.quantity -= qtyToFulfill;
        await inventory.save({ transaction: t });

        // Update quantity_fulfilled in user request item
        reqItem.quantity_fulfilled = qtyToFulfill;
        await reqItem.save({ transaction: t });
      }

      // Mark request as fulfilled
      userRequest.status = 'fulfilled';
      userRequest.fulfilled_at = new Date();
      await userRequest.save({ transaction: t });

      // Create Audit Log
      await AuditLog.create({
        user_id: reviewerId,
        action: 'REQUEST_FULFILLED',
        table_name: 'user_requests',
        changes: JSON.stringify({
          request_id: userRequest.id,
          warehouse_id,
          fulfilled_items,
        }),
        ip_address: req.ip,
      }, { transaction: t });
    });

    // Notify requester
    const requester = await User.findByPk(userRequest.requested_by);
    if (requester) {
      await NotificationService.createNotification({
        type: 'request_fulfilled',
        message: `Your request [${userRequest.request_number}] has been fulfilled`,
        product_id: null,
        warehouse_id: null,
        current_quantity: null,
        reorder_level: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Request fulfilled successfully',
      data: userRequest,
    });
  } catch (error) {
    console.error('Error fulfilling request:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to fulfill request' });
  }
};
