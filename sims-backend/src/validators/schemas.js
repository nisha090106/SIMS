import Joi from 'joi';

export const authValidators = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    first_name: Joi.string().min(2).required().messages({
      'string.min': 'First name must be at least 2 characters',
      'any.required': 'First name is required',
    }),
    last_name: Joi.string().allow('', null).optional(),
    department: Joi.string().optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

export const productValidators = {
  create: Joi.object({
    sku: Joi.string().max(50).required(),
    name: Joi.string().min(2).max(150).required(),
    description: Joi.string().allow(null, '').optional(),
    category: Joi.string().max(80).required(),
    unit: Joi.string().max(20).allow(null, '').optional(),
    reorder_level: Joi.number().integer().min(0).required(),
    reorder_qty: Joi.number().integer().min(0).optional(),
    unit_price: Joi.number().positive().required(),
    cost_price: Joi.number().min(0).allow(null).optional(),
    barcode: Joi.string().max(100).allow(null, '').optional(),
    image_url: Joi.string().max(500).allow(null, '').optional(),
    is_active: Joi.boolean().optional(),
  }),

  update: Joi.object({
    sku: Joi.string().max(50).optional(),
    name: Joi.string().min(2).max(150).optional(),
    description: Joi.string().allow(null, '').optional(),
    category: Joi.string().max(80).optional(),
    unit: Joi.string().max(20).allow(null, '').optional(),
    reorder_level: Joi.number().integer().min(0).optional(),
    reorder_qty: Joi.number().integer().min(0).optional(),
    unit_price: Joi.number().positive().optional(),
    cost_price: Joi.number().min(0).allow(null).optional(),
    barcode: Joi.string().max(100).allow(null, '').optional(),
    image_url: Joi.string().max(500).allow(null, '').optional(),
    is_active: Joi.boolean().optional(),
  }),
};

export const warehouseValidators = {
  create: Joi.object({
    name:       Joi.string().max(100).required(),
    code:       Joi.string().max(20).allow(null, '').optional(),
    location:   Joi.string().max(50).required(),
    city:       Joi.string().max(80).allow(null, '').optional(),
    country:    Joi.string().max(60).allow(null, '').optional(),
    address:    Joi.string().optional(),
    capacity:   Joi.number().positive().required(),
    manager_id: Joi.number().integer().required(),
    status:     Joi.string().valid('active', 'inactive').optional(),
  }),

  update: Joi.object({
    name:       Joi.string().max(100).optional(),
    code:       Joi.string().max(20).allow(null, '').optional(),
    location:   Joi.string().max(50).optional(),
    city:       Joi.string().max(80).allow(null, '').optional(),
    country:    Joi.string().max(60).allow(null, '').optional(),
    address:    Joi.string().optional(),
    capacity:   Joi.number().positive().optional(),
    current_usage: Joi.number().min(0).optional(),
    manager_id: Joi.number().integer().optional(),
    status:     Joi.string().valid('active', 'inactive').optional(),
  }),
};

export const inventoryValidators = {
  create: Joi.object({
    product_id: Joi.number().integer().required(),
    warehouse_id: Joi.number().integer().required(),
    quantity: Joi.number().integer().min(0).required(),
    batch_no: Joi.string().optional(),
    expiry_date: Joi.date().optional().allow('', null),
    location: Joi.string().optional(),
  }),

  update: Joi.object({
    quantity: Joi.number().integer().min(0).optional(),
    batch_no: Joi.string().optional(),
    expiry_date: Joi.date().optional().allow('', null),
    location: Joi.string().optional(),
  }),
};

export const supplierValidators = {
  create: Joi.object({
    name: Joi.string().max(150).required(),
    contact_person: Joi.string().max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().max(20).optional(),
    address: Joi.string().optional(),
    payment_terms: Joi.string().max(100).optional(),
    lead_time: Joi.number().integer().min(0).optional(),
    rating: Joi.number().min(0).max(5).optional(),
  }),

  update: Joi.object({
    name: Joi.string().max(150).optional(),
    contact_person: Joi.string().max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().max(20).optional(),
    address: Joi.string().optional(),
    payment_terms: Joi.string().max(100).optional(),
    lead_time: Joi.number().integer().min(0).optional(),
    rating: Joi.number().min(0).max(5).optional(),
    status: Joi.string().valid('active', 'inactive', 'blacklisted').optional(),
  }),

  updateRating: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
  }),
};

// Validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    req.validatedBody = value;
    next();
  };
};

export default {
  authValidators,
  productValidators,
  warehouseValidators,
  inventoryValidators,
  validate,
};
