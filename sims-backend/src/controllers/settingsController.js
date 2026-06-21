import { Op } from 'sequelize';
import { User, AuditLog, sequelize } from '../models/index.js';
import AuthService from '../services/authService.js';
import asyncHandler from 'express-async-handler';
import logger from '../config/logger.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const uid  = (req) => req.user?.id || req.user?.user_id;
const role = (req) => req.user?.role;

const SAFE_ATTRS = ['id', 'email', 'first_name', 'last_name', 'role', 'status', 'created_at', 'updated_at', 'warehouse_id'];

async function audit(req, action, changes, t) {
  try {
    await AuditLog.create(
      { user_id: uid(req), action, table_name: 'users', changes, ip_address: req.ip },
      t ? { transaction: t } : {},
    );
  } catch (e) {
    logger.warn(`Settings audit log failed: ${e.message}`);
  }
}

// ── Profile ──────────────────────────────────────────────────────────────────

/**
 * GET /api/settings/profile
 * Returns the full profile of the currently logged-in user.
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(uid(req), {
    attributes: SAFE_ATTRS,
  });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  res.json({ success: true, data: user });
});

/**
 * PUT /api/settings/profile
 * Update first_name, last_name, email for the current user.
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, email } = req.body;
  const userId = uid(req);

  if (!first_name?.trim()) {
    return res.status(400).json({ success: false, error: 'First name is required' });
  }
  if (!email?.trim()) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  // Email uniqueness — exclude self
  const existing = await User.findOne({ where: { email: email.trim(), id: { [Op.ne]: userId } } });
  if (existing) {
    return res.status(409).json({ success: false, error: 'Email is already in use by another account' });
  }

  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) { await t.rollback(); return res.status(404).json({ success: false, error: 'User not found' }); }

    const before = { first_name: user.first_name, last_name: user.last_name, email: user.email };
    await user.update({ first_name: first_name.trim(), last_name: (last_name || '').trim(), email: email.trim() }, { transaction: t });
    await audit(req, 'update', { entity: 'profile', before, after: { first_name, last_name, email } }, t);
    await t.commit();

    // Return safe payload the frontend can use to update Redux
    res.json({
      success: true,
      data: {
        id: user.id, email: user.email,
        first_name: user.first_name, last_name: user.last_name,
        full_name: user.full_name, role: user.role,
      },
      message: 'Profile updated successfully',
    });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});

/**
 * PUT /api/settings/password
 * Change current user's password. Requires current_password confirmation.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ success: false, error: 'All password fields are required' });
  }
  if (new_password !== confirm_password) {
    return res.status(400).json({ success: false, error: 'New passwords do not match' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
  }
  if (new_password === current_password) {
    return res.status(400).json({ success: false, error: 'New password must be different from current password' });
  }

  const user = await User.findByPk(uid(req));
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const match = await user.comparePassword(current_password);
  if (!match) return res.status(401).json({ success: false, error: 'Current password is incorrect' });

  const t = await sequelize.transaction();
  try {
    await user.update({ password: new_password }, { transaction: t });
    await audit(req, 'update', { entity: 'password_change', userId: uid(req) }, t);
    await t.commit();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});

// ── User Management (admin-only) ─────────────────────────────────────────────

/**
 * GET /api/settings/users
 * Paginated, filterable list of all users.
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { search, role: roleFilter, status: statusFilter, page = 1, limit = 20 } = req.query;

  const where = {};
  if (roleFilter)   where.role   = roleFilter;
  if (statusFilter) where.status = statusFilter;
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name:  { [Op.iLike]: `%${search}%` } },
      { email:      { [Op.iLike]: `%${search}%` } },
    ];
  }

  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
  const lim    = Math.min(100, parseInt(limit));

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: SAFE_ATTRS,
    order: [['created_at', 'DESC']],
    limit: lim,
    offset,
  });

  res.json({
    success: true,
    data: {
      users: rows,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / lim),
      limit: lim,
    },
  });
});

/**
 * POST /api/settings/users
 * Create a new user (admin only).
 */
export const createUser = asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, role: newRole = 'staff', warehouse_id } = req.body;

  if (!email || !password || !first_name) {
    return res.status(400).json({ success: false, error: 'email, password, and first_name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }

  const validRoles = ['admin', 'manager', 'staff', 'user'];
  if (!validRoles.includes(newRole)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ success: false, error: 'Email already in use' });

  const t = await sequelize.transaction();
  try {
    const user = await User.create(
      {
        email,
        password,
        first_name,
        last_name: last_name || '',
        role: newRole,
        status: 'active',
        warehouse_id: (newRole === 'manager' || newRole === 'staff') ? (warehouse_id || null) : null
      },
      { transaction: t },
    );
    await audit(req, 'create', { entity: 'user_create', created: { id: user.id, email, role: newRole, warehouse_id: user.warehouse_id } }, t);
    await t.commit();

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        warehouse_id: user.warehouse_id
      },
      message: 'User created successfully',
    });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});

/**
 * PUT /api/settings/users/:id
 * Update first_name, last_name, email, role for a user (admin only).
 * Admin cannot change their own role.
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, role: newRole, warehouse_id } = req.body;
  const currentUserId = uid(req);

  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  // Prevent demoting yourself
  if (Number(id) === Number(currentUserId) && newRole && newRole !== 'admin') {
    return res.status(400).json({ success: false, error: 'Admins cannot change their own role' });
  }

  if (email) {
    const dup = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
    if (dup) return res.status(409).json({ success: false, error: 'Email already in use' });
  }

  const validRoles = ['admin', 'manager', 'staff', 'user'];
  if (newRole && !validRoles.includes(newRole)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }

  const t = await sequelize.transaction();
  try {
    const before = { first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, warehouse_id: user.warehouse_id };
    const updates = {};
    if (first_name) updates.first_name = first_name.trim();
    if (last_name !== undefined) updates.last_name = (last_name || '').trim();
    if (email) updates.email = email.trim();
    if (newRole) updates.role = newRole;

    const targetRole = newRole || user.role;
    if (targetRole !== 'manager' && targetRole !== 'staff') {
      updates.warehouse_id = null;
    } else if (warehouse_id !== undefined) {
      updates.warehouse_id = warehouse_id ? parseInt(warehouse_id, 10) : null;
    }

    await user.update(updates, { transaction: t });
    await audit(req, 'update', { entity: 'user_update', targetUserId: Number(id), before, after: updates }, t);
    await t.commit();

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        warehouse_id: user.warehouse_id
      },
      message: 'User updated successfully',
    });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});

/**
 * PATCH /api/settings/users/:id/status
 * Activate or deactivate a user. Admin cannot deactivate themselves.
 */
export const setUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const currentUserId = uid(req);

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status must be "active" or "inactive"' });
  }
  if (Number(id) === Number(currentUserId) && status === 'inactive') {
    return res.status(400).json({ success: false, error: 'You cannot deactivate your own account' });
  }

  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const t = await sequelize.transaction();
  try {
    await user.update({ status }, { transaction: t });
    await audit(req, 'update', { entity: 'user_status', targetUserId: Number(id), oldStatus: user.status, newStatus: status }, t);
    await t.commit();

    res.json({ success: true, data: { id: user.id, status: user.status }, message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully` });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});

/**
 * POST /api/settings/users/:id/reset-password
 * Admin resets another user's password.
 */
export const adminResetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
  }

  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const t = await sequelize.transaction();
  try {
    await user.update({ password: new_password }, { transaction: t });
    await audit(req, 'update', { entity: 'admin_password_reset', targetUserId: Number(id), targetEmail: user.email }, t);
    await t.commit();

    res.json({ success: true, message: `Password reset for ${user.email}` });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});

/**
 * DELETE /api/settings/users/:id
 * Hard-delete only if admin and target is inactive, or soft-deactivate.
 * For safety this implementation only deactivates (never hard-deletes).
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = uid(req);

  if (Number(id) === Number(currentUserId)) {
    return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
  }

  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const t = await sequelize.transaction();
  try {
    await user.update({ status: 'inactive' }, { transaction: t });
    await audit(req, 'delete', { entity: 'user_deactivate', targetUserId: Number(id), email: user.email }, t);
    await t.commit();

    res.json({ success: true, message: 'User deactivated (soft-deleted)' });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});

// ── Audit Log (admin only) ───────────────────────────────────────────────────

/**
 * GET /api/settings/audit-log
 * Paginated audit log with filters: userId, action, tableName, from, to.
 */
export const getAuditLog = asyncHandler(async (req, res) => {
  const { userId, action, tableName, from, to, page = 1, limit = 25 } = req.query;

  const where = {};
  if (userId)    where.user_id    = parseInt(userId);
  if (action)    where.action     = action;
  if (tableName) where.table_name = tableName;
  if (from && to) {
    where.timestamp = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
  } else if (from) {
    where.timestamp = { [Op.gte]: new Date(from) };
  } else if (to) {
    where.timestamp = { [Op.lte]: new Date(to + 'T23:59:59') };
  }

  const lim    = Math.min(200, parseInt(limit));
  const offset = (Math.max(1, parseInt(page)) - 1) * lim;

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'role'] }],
    order: [['timestamp', 'DESC']],
    limit: lim,
    offset,
  });

  res.json({
    success: true,
    data: {
      logs: rows.map(l => ({
        logId:     l.log_id,
        userId:    l.user_id,
        userName:  l.user ? `${l.user.first_name || ''} ${l.user.last_name || ''}`.trim() || l.user.email : 'System',
        userEmail: l.user?.email || '—',
        userRole:  l.user?.role  || '—',
        action:    l.action,
        tableName: l.table_name,
        changes:   l.changes,
        timestamp: l.timestamp,
        ipAddress: l.ip_address || null,
      })),
      total: count,
      page:  parseInt(page),
      pages: Math.ceil(count / lim),
      limit: lim,
    },
  });
});
