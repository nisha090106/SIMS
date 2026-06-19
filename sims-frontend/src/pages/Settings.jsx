import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  Person as PersonIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  Lock as LockIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Key as KeyIcon,
  Delete as DeleteIcon,
  Download as ExportIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { settingsAPI } from '../services/api';
import { setUser } from '../store/authSlice';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';

/* ── Shared style tokens ─────────────────────────────────────── */
const td = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--color-border)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
  color: 'var(--color-text-primary)',
  verticalAlign: 'middle',
};

const sectionTitle = {
  margin: '0 0 4px',
  fontSize: 'var(--text-2xl)',
  fontWeight: 800,
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-sans)',
};

const sectionSub = {
  margin: 0,
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-sans)',
};

/* ── Role / status badge maps ────────────────────────────────── */
const ROLE_VARIANT = { admin: 'danger', manager: 'primary', staff: 'info', user: 'neutral' };
const STATUS_VARIANT = { active: 'success', inactive: 'neutral' };
const ACTION_VARIANT = {
  create: 'success', update: 'primary', delete: 'danger',
  login: 'info', logout: 'neutral',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/* ── Validation schemas ──────────────────────────────────────── */
const profileSchema = Yup.object({
  first_name: Yup.string().trim().required('First name is required'),
  last_name:  Yup.string().trim(),
  email:      Yup.string().email('Invalid email').required('Email is required'),
});

const passwordSchema = Yup.object({
  current_password: Yup.string().required('Current password is required'),
  new_password:     Yup.string().min(8, 'Minimum 8 characters').required('New password is required'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('new_password')], 'Passwords do not match')
    .required('Confirm your new password'),
});

const createUserSchema = Yup.object({
  first_name: Yup.string().trim().required('First name is required'),
  last_name:  Yup.string().trim(),
  email:      Yup.string().email('Invalid email').required('Email is required'),
  password:   Yup.string().min(8, 'Minimum 8 characters').required('Password is required'),
  role:       Yup.string().oneOf(['admin','manager','staff','user']).required(),
});

const resetPasswordSchema = Yup.object({
  new_password:     Yup.string().min(8, 'Minimum 8 characters').required('New password is required'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('new_password')], 'Passwords do not match')
    .required(),
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 1 — My Profile
═══════════════════════════════════════════════════════════════ */
function ProfileSection() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsAPI.getProfile()
      .then((r) => setProfile(r.data.data))
      .catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async (values, { setSubmitting }) => {
    try {
      const res = await settingsAPI.updateProfile(values);
      const updated = res.data.data;
      setProfile(updated);
      // Sync Redux + localStorage
      dispatch(setUser({ ...user, ...updated }));
      showToast('Profile updated successfully', 'success');
    } catch (e) {
      showToast(e.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSave = async (values, { setSubmitting, resetForm }) => {
    try {
      await settingsAPI.changePassword(values);
      showToast('Password changed successfully', 'success');
      resetForm();
    } catch (e) {
      showToast(e.response?.data?.error || 'Password change failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
      {[1, 2].map(i => (
        <Card key={i}>
          <div style={{ padding: 20 }}>
            {[1,2,3].map(j => (
              <div key={j} style={{ height: 38, borderRadius: 8, background: '#f1f5f9', marginBottom: 16 }} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      {/* ── Profile info form ── */}
      <Card>
        <Card.Header title="Personal Information" subtitle="Update your name and email address" />
        <Card.Body>
          <Formik
            initialValues={{ first_name: profile?.first_name || '', last_name: profile?.last_name || '', email: profile?.email || '' }}
            validationSchema={profileSchema}
            enableReinitialize
            onSubmit={handleProfileSave}
          >
            {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
              <Form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input
                    label="First Name" required
                    name="first_name" value={values.first_name}
                    onChange={handleChange} onBlur={handleBlur}
                    error={touched.first_name && errors.first_name}
                  />
                  <Input
                    label="Last Name"
                    name="last_name" value={values.last_name}
                    onChange={handleChange} onBlur={handleBlur}
                    error={touched.last_name && errors.last_name}
                  />
                </div>
                <Input
                  label="Email Address" required type="email"
                  name="email" value={values.email}
                  onChange={handleChange} onBlur={handleBlur}
                  error={touched.email && errors.email}
                />
                {/* Read-only role */}
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>Role</p>
                  <Badge variant={ROLE_VARIANT[profile?.role] || 'neutral'} size="md" style={{ textTransform: 'capitalize', padding: '5px 12px' }}>
                    {profile?.role}
                  </Badge>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Contact an administrator to change your role.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
                    Save Changes
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Card.Body>
      </Card>

      {/* ── Change password form ── */}
      <Card>
        <Card.Header title="Change Password" subtitle="Use a strong password with 8+ characters" />
        <Card.Body>
          <Formik
            initialValues={{ current_password: '', new_password: '', confirm_password: '' }}
            validationSchema={passwordSchema}
            onSubmit={handlePasswordSave}
          >
            {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
              <Form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                  label="Current Password" required type="password"
                  leftIcon={<LockIcon style={{ fontSize: 16 }} />}
                  name="current_password" value={values.current_password}
                  onChange={handleChange} onBlur={handleBlur}
                  error={touched.current_password && errors.current_password}
                />
                <Input
                  label="New Password" required type="password"
                  leftIcon={<LockIcon style={{ fontSize: 16 }} />}
                  name="new_password" value={values.new_password}
                  onChange={handleChange} onBlur={handleBlur}
                  error={touched.new_password && errors.new_password}
                  helper="At least 8 characters"
                />
                <Input
                  label="Confirm New Password" required type="password"
                  leftIcon={<LockIcon style={{ fontSize: 16 }} />}
                  name="confirm_password" value={values.confirm_password}
                  onChange={handleChange} onBlur={handleBlur}
                  error={touched.confirm_password && errors.confirm_password}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
                    Update Password
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Card.Body>
      </Card>

      {/* ── Account meta ── */}
      <Card title="Account Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            { label: 'Account Status', value: <Badge variant={STATUS_VARIANT[profile?.status] || 'neutral'}>{profile?.status}</Badge> },
            { label: 'Member Since',   value: fmtDate(profile?.created_at) },
            { label: 'Last Updated',   value: fmtDate(profile?.updated_at) },
            { label: 'User ID',        value: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>#{profile?.id}</code> },
          ].map((item, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', borderRight: i % 2 === 0 ? '1px solid var(--color-border)' : 'none' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
              <div style={{ marginTop: 4, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 2 — User Management (admin only)
═══════════════════════════════════════════════════════════════ */
function UserManagementSection() {
  const { showToast } = useToast();
  const { user: currentUser } = useSelector((s) => s.auth);

  const [users,       setUsers]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [debSearch,   setDebSearch]   = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const debRef = useRef(null);

  // Modals
  const [createOpen,  setCreateOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [actionLoading,setActionLoading] = useState('');

  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => clearTimeout(debRef.current);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.getUsers({
        page, limit: 15,
        search: debSearch || undefined,
        role:   roleFilter  || undefined,
        status: statusFilter || undefined,
      });
      const d = res.data.data;
      setUsers(d.users);
      setTotal(d.total);
      setTotalPages(d.pages);
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debSearch, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* ── Create user ── */
  const handleCreate = async (values, { setSubmitting }) => {
    try {
      await settingsAPI.createUser(values);
      showToast(`User ${values.email} created`, 'success');
      setCreateOpen(false);
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.error || 'Create failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Edit user ── */
  const handleEdit = async (values, { setSubmitting }) => {
    try {
      await settingsAPI.updateUser(editTarget.id, values);
      showToast('User updated', 'success');
      setEditTarget(null);
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Toggle status ── */
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setActionLoading(`status-${user.id}`);
    try {
      await settingsAPI.setUserStatus(user.id, newStatus);
      showToast(`User ${newStatus}`, 'success');
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.error || 'Status update failed', 'error');
    } finally {
      setActionLoading('');
    }
  };

  /* ── Reset password ── */
  const handleResetPassword = async (values, { setSubmitting }) => {
    try {
      await settingsAPI.resetUserPassword(resetTarget.id, values.new_password);
      showToast(`Password reset for ${resetTarget.email}`, 'success');
      setResetTarget(null);
    } catch (e) {
      showToast(e.response?.data?.error || 'Reset failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete/deactivate ── */
  const handleDelete = async () => {
    setActionLoading('delete');
    try {
      await settingsAPI.deleteUser(deleteTarget.id);
      showToast('User deactivated', 'success');
      setDeleteTarget(null);
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.error || 'Delete failed', 'error');
    } finally {
      setActionLoading('');
    }
  };

  /* ── CSV export ── */
  const handleExport = () => {
    const rows = [
      ['ID', 'Name', 'Email', 'Role', 'Status', 'Created'],
      ...users.map(u => [u.id, `${u.first_name} ${u.last_name}`.trim(), u.email, u.role, u.status, fmtDate(u.created_at)]),
    ];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `users-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: 'name',    label: 'Name',    skeletonWidth: '70%' },
    { key: 'email',   label: 'Email',   skeletonWidth: '60%' },
    { key: 'role',    label: 'Role',    width: 100, align: 'center' },
    { key: 'status',  label: 'Status',  width: 90,  align: 'center' },
    { key: 'created', label: 'Created', width: 120 },
    { key: 'actions', label: '',        width: 200, align: 'right' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={sectionTitle}>User Management</h2>
          <p style={sectionSub}>{total} users total</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" leftIcon={<ExportIcon style={{ fontSize: 16 }} />} onClick={handleExport}>Export</Button>
          <Button variant="ghost" size="sm" leftIcon={<RefreshIcon style={{ fontSize: 16 }} />} onClick={fetchUsers} loading={loading}>Refresh</Button>
          <Button variant="primary" size="sm" leftIcon={<AddIcon style={{ fontSize: 18 }} />} onClick={() => setCreateOpen(true)}>New User</Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding={false}>
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Input placeholder="Search name or email…" value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<SearchIcon style={{ fontSize: 16 }} />} />
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <Select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="user">User</option>
            </Select>
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>

        <Table
          columns={columns}
          data={users}
          loading={loading}
          emptyText="No users found."
          renderRow={(u, i) => (
            <tr key={u.id}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <td style={td}>
                <div style={{ fontWeight: 600 }}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>#{u.id}</div>
              </td>
              <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{u.email}</td>
              <td style={{ ...td, textAlign: 'center' }}>
                <Badge variant={ROLE_VARIANT[u.role] || 'neutral'} size="sm" style={{ textTransform: 'capitalize' }}>{u.role}</Badge>
              </td>
              <td style={{ ...td, textAlign: 'center' }}>
                <Badge variant={STATUS_VARIANT[u.status] || 'neutral'} size="sm" dot>{u.status}</Badge>
              </td>
              <td style={{ ...td, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{fmtDate(u.created_at)}</td>
              <td style={{ ...td, textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" leftIcon={<EditIcon style={{ fontSize: 14 }} />}
                    onClick={() => setEditTarget(u)}>Edit</Button>
                  <Button variant="ghost" size="sm" leftIcon={<KeyIcon style={{ fontSize: 14 }} />}
                    onClick={() => setResetTarget(u)}>Reset PW</Button>
                  {Number(u.id) !== Number(currentUser?.id) && (
                    u.status === 'active' ? (
                      <Button variant="ghost" size="sm" leftIcon={<BlockIcon style={{ fontSize: 14 }} />}
                        loading={actionLoading === `status-${u.id}`}
                        onClick={() => handleToggleStatus(u)}
                        style={{ color: 'var(--color-warning)' }}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" leftIcon={<ActivateIcon style={{ fontSize: 14 }} />}
                        loading={actionLoading === `status-${u.id}`}
                        onClick={() => handleToggleStatus(u)}
                        style={{ color: 'var(--color-success)' }}>
                        Activate
                      </Button>
                    )
                  )}
                </div>
              </td>
            </tr>
          )}
        />

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
              Page {page} of {totalPages} · {total} users
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Create User Modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New User" size="md">
        <Formik initialValues={{ first_name: '', last_name: '', email: '', password: '', role: 'staff' }}
          validationSchema={createUserSchema} onSubmit={handleCreate}>
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form>
              <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Input label="First Name" required name="first_name" value={values.first_name}
                    onChange={handleChange} onBlur={handleBlur}
                    error={touched.first_name && errors.first_name} />
                  <Input label="Last Name" name="last_name" value={values.last_name}
                    onChange={handleChange} onBlur={handleBlur} />
                </div>
                <Input label="Email" required type="email" name="email" value={values.email}
                  onChange={handleChange} onBlur={handleBlur}
                  error={touched.email && errors.email} />
                <Input label="Password" required type="password" name="password" value={values.password}
                  onChange={handleChange} onBlur={handleBlur}
                  error={touched.password && errors.password} helper="Minimum 8 characters" />
                <Select label="Role" value={values.role}
                  onChange={e => handleChange({ target: { name: 'role', value: e.target.value } })}>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="user">User (Requester)</option>
                </Select>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" size="sm" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit" loading={isSubmitting}>Create User</Button>
              </Modal.Footer>
            </Form>
          )}
        </Formik>
      </Modal>

      {/* ── Edit User Modal ── */}
      {editTarget && (
        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget.email}`} size="md">
          <Formik
            initialValues={{ first_name: editTarget.first_name || '', last_name: editTarget.last_name || '', email: editTarget.email || '', role: editTarget.role || 'staff' }}
            validationSchema={Yup.object({
              first_name: Yup.string().trim().required('Required'),
              email: Yup.string().email('Invalid email').required('Required'),
              role: Yup.string().oneOf(['admin','manager','staff','user']).required(),
            })}
            onSubmit={handleEdit}>
            {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
              <Form>
                <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Input label="First Name" required name="first_name" value={values.first_name}
                      onChange={handleChange} onBlur={handleBlur}
                      error={touched.first_name && errors.first_name} />
                    <Input label="Last Name" name="last_name" value={values.last_name}
                      onChange={handleChange} onBlur={handleBlur} />
                  </div>
                  <Input label="Email" required type="email" name="email" value={values.email}
                    onChange={handleChange} onBlur={handleBlur}
                    error={touched.email && errors.email} />
                  <Select label="Role" value={values.role}
                    onChange={e => handleChange({ target: { name: 'role', value: e.target.value } })}
                    disabled={Number(editTarget.id) === Number(currentUser?.id)}>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="user">User (Requester)</option>
                  </Select>
                  {Number(editTarget.id) === Number(currentUser?.id) && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', margin: 0 }}>
                      You cannot change your own role.
                    </p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setEditTarget(null)}>Cancel</Button>
                  <Button variant="primary" size="sm" type="submit" loading={isSubmitting}>Save Changes</Button>
                </Modal.Footer>
              </Form>
            )}
          </Formik>
        </Modal>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget.email}`} size="sm">
          <Formik initialValues={{ new_password: '', confirm_password: '' }}
            validationSchema={resetPasswordSchema} onSubmit={handleResetPassword}>
            {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
              <Form>
                <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    Set a new password for <strong>{resetTarget.email}</strong>. They will need to use this password to log in.
                  </p>
                  <Input label="New Password" required type="password" name="new_password" value={values.new_password}
                    leftIcon={<LockIcon style={{ fontSize: 16 }} />}
                    onChange={handleChange} onBlur={handleBlur}
                    error={touched.new_password && errors.new_password} helper="Minimum 8 characters" />
                  <Input label="Confirm Password" required type="password" name="confirm_password" value={values.confirm_password}
                    leftIcon={<LockIcon style={{ fontSize: 16 }} />}
                    onChange={handleChange} onBlur={handleBlur}
                    error={touched.confirm_password && errors.confirm_password} />
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setResetTarget(null)}>Cancel</Button>
                  <Button variant="primary" size="sm" type="submit" loading={isSubmitting}>Reset Password</Button>
                </Modal.Footer>
              </Form>
            )}
          </Formik>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Deactivate User" size="sm">
          <Modal.Body>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
              Deactivate <strong>{deleteTarget.email}</strong>? They will no longer be able to log in.
              This can be undone by reactivating the account.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={actionLoading === 'delete'} onClick={handleDelete}>Deactivate</Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3 — Audit Log (admin only)
═══════════════════════════════════════════════════════════════ */
function AuditLogSection() {
  const { showToast } = useToast();

  const [logs,      setLogs]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [totalPages,setTotalPages]= useState(1);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [expanded,  setExpanded]  = useState(null);

  const [filters, setFilters] = useState({ from: '', to: '', action: '', tableName: '', userId: '' });
  const [applied, setApplied] = useState({});

  const fetchLogs = useCallback(async (p = page, f = applied) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 25 };
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await settingsAPI.getAuditLog(params);
      const d = res.data.data;
      setLogs(d.logs);
      setTotal(d.total);
      setTotalPages(d.pages);
    } catch (e) {
      showToast('Failed to load audit log', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => { fetchLogs(1, {}); }, []);

  const handleApply = () => { setApplied({ ...filters }); setPage(1); fetchLogs(1, filters); };
  const handleClear = () => {
    const reset = { from: '', to: '', action: '', tableName: '', userId: '' };
    setFilters(reset); setApplied({}); setPage(1); fetchLogs(1, {});
  };

  const handleExport = () => {
    const rows = [
      ['Log ID', 'Timestamp', 'User', 'Email', 'Role', 'Action', 'Table', 'IP'],
      ...logs.map(l => [l.logId, fmtDateTime(l.timestamp), l.userName, l.userEmail, l.userRole, l.action, l.tableName, l.ipAddress || '']),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const AUDIT_ACTIONS = ['create','update','delete','login','logout','BARCODE_SCAN','CREATE_PURCHASE_ORDER',
    'UPDATE_PURCHASE_ORDER','APPROVE_PURCHASE_ORDER','RECEIVE_PURCHASE_ORDER','CANCEL_PURCHASE_ORDER','REQUEST_FULFILLED'];

  const columns = [
    { key: 'timestamp', label: 'Timestamp', width: 160, skeletonWidth: '80%' },
    { key: 'user',      label: 'User',                  skeletonWidth: '60%' },
    { key: 'action',    label: 'Action',    width: 160, skeletonWidth: '50%' },
    { key: 'table',     label: 'Entity',    width: 120, skeletonWidth: '40%' },
    { key: 'ip',        label: 'IP',        width: 130, skeletonWidth: '50%' },
    { key: 'details',   label: '',          width: 80,  align: 'right' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={sectionTitle}>Audit Log</h2>
          <p style={sectionSub}>{total.toLocaleString()} events recorded</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" leftIcon={<ExportIcon style={{ fontSize: 16 }} />} onClick={handleExport}>Export CSV</Button>
          <Button variant="ghost" size="sm" leftIcon={<RefreshIcon style={{ fontSize: 16 }} />} onClick={() => fetchLogs(page, applied)} loading={loading}>Refresh</Button>
        </div>
      </div>

      {/* Filters */}
      <Card title="Filters" action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" size="sm" onClick={handleApply}>Apply</Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
        </div>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Input label="From" type="date" value={filters.from}
            onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
          <Input label="To" type="date" value={filters.to}
            onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
          <Select label="Action" value={filters.action}
            onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}>
            <option value="">All Actions</option>
            {AUDIT_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </Select>
          <Input label="Entity / Table" placeholder="e.g. users, products" value={filters.tableName}
            onChange={e => setFilters(p => ({ ...p, tableName: e.target.value }))} />
          <Input label="User ID" type="number" placeholder="e.g. 3" value={filters.userId}
            onChange={e => setFilters(p => ({ ...p, userId: e.target.value }))} />
        </div>
      </Card>

      {/* Log table */}
      <Card padding={false}>
        <Table
          columns={columns}
          data={logs}
          loading={loading}
          emptyText="No audit log entries found."
          renderRow={(log, i) => (
            <React.Fragment key={log.logId}>
              <tr
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={td}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDateTime(log.timestamp)}</div>
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{log.userName}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{log.userEmail}</div>
                </td>
                <td style={td}>
                  <Badge variant={ACTION_VARIANT[log.action?.toLowerCase()] || 'neutral'} size="sm"
                    style={{ textTransform: 'none', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {log.action}
                  </Badge>
                </td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {log.tableName || '—'}
                </td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {log.ipAddress || '—'}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {log.changes && (
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === log.logId ? null : log.logId)}>
                      {expanded === log.logId ? 'Hide' : 'Details'}
                    </Button>
                  )}
                </td>
              </tr>
              {/* Expanded changes row */}
              {expanded === log.logId && log.changes && (
                <tr>
                  <td colSpan={6} style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <pre style={{
                      margin: 0, fontSize: 12, fontFamily: 'var(--font-mono)',
                      color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      background: '#f1f5f9', padding: '10px 14px', borderRadius: 6,
                    }}>
                      {typeof log.changes === 'string'
                        ? (() => { try { return JSON.stringify(JSON.parse(log.changes), null, 2); } catch { return log.changes; } })()
                        : JSON.stringify(log.changes, null, 2)}
                    </pre>
                  </td>
                </tr>
              )}
            </React.Fragment>
          )}
        />

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
              Page {page} of {totalPages} · {total.toLocaleString()} records
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { setPage(1); fetchLogs(1, applied); }}>«</Button>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchLogs(p, applied); }}>‹</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); fetchLogs(p, applied); }}>›</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => { setPage(totalPages); fetchLogs(totalPages, applied); }}>»</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT Settings Component — Tab shell
═══════════════════════════════════════════════════════════════ */
const TABS_ALL   = [
  { id: 'profile', label: 'My Profile',       icon: <PersonIcon  style={{ fontSize: 18 }} /> },
  { id: 'users',   label: 'User Management',  icon: <PeopleIcon  style={{ fontSize: 18 }} />, adminOnly: true },
  { id: 'audit',   label: 'Audit Log',        icon: <HistoryIcon style={{ fontSize: 18 }} />, adminOnly: true },
];

export default function Settings() {
  const { user } = useSelector((s) => s.auth);
  const isAdmin  = user?.role === 'admin';

  const tabs = TABS_ALL.filter(t => !t.adminOnly || isAdmin);
  const [active, setActive] = useState('profile');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 1200, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
          Settings
        </h1>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          Manage your account, users, and system activity
        </p>
      </div>

      {/* Tab strip */}
      <div style={{
        display: 'flex',
        gap: 4,
        background: 'var(--color-surface-alt)',
        padding: 4,
        borderRadius: 12,
        marginBottom: 28,
        border: '1px solid var(--color-border)',
        width: 'fit-content',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: active === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: active === tab.id ? 'var(--color-surface)' : 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: active === tab.id ? 'var(--shadow-card)' : 'none',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active section */}
      {active === 'profile' && <ProfileSection />}
      {active === 'users'   && isAdmin && <UserManagementSection />}
      {active === 'audit'   && isAdmin && <AuditLogSection />}
    </div>
  );
}
