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
    full_name: Joi.string().min(2).required().messages({
      'string.min': 'Full name must be at least 2 characters',
      'any.required': 'Full name is required',
    }),
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
    category: Joi.string().max(50).required(),
    unit: Joi.string().max(20).allow(null, '').optional(),
    reorder_level: Joi.number().integer().min(0).required(),
    reorder_qty: Joi.number().integer().min(0).optional(),
    unit_price: Joi.number().positive().required(),
  }),

  update: Joi.object({
    sku: Joi.string().max(50).optional(),
    name: Joi.string().min(2).max(150).optional(),
    description: Joi.string().allow(null, '').optional(),
    category: Joi.string().max(50).optional(),
    unit: Joi.string().max(20).allow(null, '').optional(),
    reorder_level: Joi.number().integer().min(0).optional(),
    reorder_qty: Joi.number().integer().min(0).optional(),
    unit_price: Joi.number().positive().optional(),
  }),
};

export const warehouseValidators = {
  create: Joi.object({
    name: Joi.string().max(100).required(),
    location: Joi.string().max(50).required(),
    address: Joi.string().optional(),
    capacity: Joi.number().positive().required(),
    manager_id: Joi.number().integer().required(),
  }),

  update: Joi.object({
    name: Joi.string().max(100).optional(),
    location: Joi.string().max(50).optional(),
    address: Joi.string().optional(),
    capacity: Joi.number().positive().optional(),
    current_usage: Joi.number().min(0).optional(),
    manager_id: Joi.number().integer().optional(),
  }),
};

export const inventoryValidators = {
  create: Joi.object({
    product_id: Joi.number().integer().required(),
    warehouse_id: Joi.number().integer().required(),
    quantity: Joi.number().integer().min(0).required(),
    batch_no: Joi.string().optional(),
    expiry_date: Joi.date().optional(),
    location: Joi.string().optional(),
  }),

  update: Joi.object({
    quantity: Joi.number().integer().min(0).optional(),
    batch_no: Joi.string().optional(),
    expiry_date: Joi.date().optional(),
    location: Joi.string().optional(),
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
