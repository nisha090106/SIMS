import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Dashboard as DashboardIcon,
  Inventory2 as InventoryIcon,
  Warehouse as WarehouseIcon,
  Store as StoreIcon,
  People as PeopleIcon,
  ShoppingCart as PurchaseIcon,
  Receipt as SalesIcon,
  BarChart as ReportsIcon,
  Settings as SettingsIcon,
  Assignment as RequestsIcon,
  CloudUpload as ImportIcon,
  AutoMode as AutomationIcon,
  QrCodeScanner as BarcodeIcon,
  Logout as LogoutIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material';
import Tooltip from '../components/ui/Tooltip';
import Badge from '../components/ui/Badge';
import { logout } from '../store/authSlice';
import { authAPI, requestAPI } from '../services/api';
import { useToast } from '../hooks/useToast';

/* ── Nav definitions per role ── */
const NAV = {
  admin: [
    { path: '/dashboard',       label: 'Dashboard',       icon: DashboardIcon },
    { path: '/products',        label: 'Products',        icon: InventoryIcon },
    { path: '/inventory',       label: 'Inventory',       icon: WarehouseIcon },
    { path: '/warehouses',      label: 'Warehouses',      icon: StoreIcon },
    { path: '/suppliers',       label: 'Suppliers',       icon: PeopleIcon },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: PurchaseIcon },
    { path: '/sales-orders',    label: 'Sales Orders',    icon: SalesIcon },
    { path: '/requests',        label: 'Requests',        icon: RequestsIcon, badge: true },
    { path: '/barcode',         label: 'Barcode',         icon: BarcodeIcon },
    { path: '/import-center',   label: 'Bulk Import',     icon: ImportIcon },
    { path: '/automation',      label: 'Automation',      icon: AutomationIcon },
    { path: '/reports',         label: 'Reports',         icon: ReportsIcon },
    { path: '/settings',        label: 'Settings',        icon: SettingsIcon },
  ],
  manager: [
    { path: '/dashboard',       label: 'Dashboard',       icon: DashboardIcon },
    { path: '/products',        label: 'Products',        icon: InventoryIcon },
    { path: '/inventory',       label: 'Inventory',       icon: WarehouseIcon },
    { path: '/suppliers',       label: 'Suppliers',       icon: PeopleIcon },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: PurchaseIcon },
    { path: '/sales-orders',    label: 'Sales Orders',    icon: SalesIcon },
    { path: '/requests',        label: 'Requests',        icon: RequestsIcon, badge: true },
    { path: '/barcode',         label: 'Barcode',         icon: BarcodeIcon },
    { path: '/import-center',   label: 'Bulk Import',     icon: ImportIcon },
    { path: '/automation',      label: 'Automation',      icon: AutomationIcon },
    { path: '/reports',         label: 'Reports',         icon: ReportsIcon },
  ],
  staff: [
    { path: '/dashboard',  label: 'Dashboard', icon: DashboardIcon },
    { path: '/products',   label: 'Products',  icon: InventoryIcon },
    { path: '/inventory',  label: 'Inventory', icon: WarehouseIcon },
    { path: '/requests',   label: 'Requests',  icon: RequestsIcon },
    { path: '/barcode',    label: 'Barcode',   icon: BarcodeIcon },
  ],
  user: [
    { path: '/user-dashboard', label: 'Dashboard',       icon: DashboardIcon },
    { path: '/user/catalog',   label: 'Product Catalog', icon: InventoryIcon },
    { path: '/user/my-requests', label: 'My Requests',   icon: RequestsIcon },
  ],
};

/* ── Role label map ── */
const ROLE_LABELS = {
  admin:   'Administrator',
  manager: 'Manager',
  staff:   'Staff',
  user:    'Requester',
};

const ROLE_BADGE_VARIANT = {
  admin:   'danger',
  manager: 'warning',
  staff:   'info',
  user:    'success',
};

/* ── Sidebar ── */
const Sidebar = ({ collapsed, onToggle }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'staff';

  const [pendingCount, setPendingCount] = useState(0);

  /* Poll pending requests badge */
  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') return;

    const fetchPending = async () => {
      try {
        const res = await requestAPI.getAll({ status: 'pending', limit: 1 });
        if (res.data?.success) setPendingCount(res.data.total || 0);
      } catch { /* silent */ }
    };

    fetchPending();
    const id = setInterval(fetchPending, 30_000);
    return () => clearInterval(id);
  }, [role]);

  const navItems = NAV[role] || NAV.staff;

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch { /* silent */ }
    dispatch(logout());
    showToast('Logged out successfully', 'success');
    navigate('/login');
  };

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  const fullName = user?.full_name || user?.name || 'User';
  const email    = user?.email || '';

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-slow)',
        overflow: 'hidden',
        zIndex: 1100,
        boxSizing: 'border-box',
        boxShadow: '1px 0 0 0 #E2E8F0',
      }}
    >
      {/* ── Brand header ── */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #E2E8F0',
          flexShrink: 0,
          gap: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(59,130,246,0.30)',
          }}
        >
          <WarehouseIcon style={{ fontSize: 18, color: '#fff' }} />
        </div>
        {!collapsed && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#1E293B',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
            }}
          >
            SIMS
          </span>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav
        style={{
          flex: 1,
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const showBadge = item.badge && pendingCount > 0;

          return (
            <Tooltip
              key={item.path}
              content={collapsed ? item.label : null}
              placement="right"
            >
              <NavLink
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 40,
                  paddingLeft: collapsed ? 0 : 12,
                  paddingRight: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-base)',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#3B82F6' : '#64748B',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                  transition: 'all var(--transition-base)',
                  position: 'relative',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.background = '#F8FAFC';
                    e.currentTarget.style.color = '#1E293B';
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#64748B';
                  }
                }}
              >
                {/* Icon + collapsed dot badge */}
                <span style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Icon style={{ fontSize: 18 }} />
                  {showBadge && collapsed && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        width: 7,
                        height: 7,
                        background: '#EF4444',
                        borderRadius: '50%',
                        border: '1.5px solid #FFFFFF',
                      }}
                    />
                  )}
                </span>

                {/* Label + expanded badge */}
                {!collapsed && (
                  <>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    {showBadge && (
                      <Badge variant="danger" size="sm">
                        {pendingCount}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            </Tooltip>
          );
        })}
      </nav>

      {/* ── User section + collapse toggle ── */}
      <div
        style={{
          borderTop: '1px solid #E2E8F0',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flexShrink: 0,
        }}
      >
        {/* User info */}
        {!collapsed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {getInitials(fullName)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: '#1E293B',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {fullName}
              </div>
              <div style={{ marginTop: 2 }}>
                <Badge variant={ROLE_BADGE_VARIANT[role] || 'neutral'} size="sm">
                  {ROLE_LABELS[role] || role}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <Tooltip content={collapsed ? 'Sign Out' : null} placement="right">
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10,
              width: '100%',
              height: 40,
              padding: collapsed ? 0 : '0 10px',
              background: 'none',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#64748B',
              fontSize: 'var(--text-base)',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'background var(--transition-base), color var(--transition-base)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FEE2E2';
              e.currentTarget.style.color = '#EF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <LogoutIcon style={{ fontSize: 18, flexShrink: 0 }} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </Tooltip>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            width: '100%',
            height: 40,
            padding: collapsed ? 0 : '0 10px',
            background: 'none',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#94A3B8',
            fontSize: 'var(--text-base)',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'background var(--transition-base), color var(--transition-base)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F8FAFC';
            e.currentTarget.style.color = '#1E293B';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#94A3B8';
          }}
        >
          {collapsed
            ? <ExpandIcon style={{ fontSize: 18 }} />
            : <><CollapseIcon style={{ fontSize: 18, flexShrink: 0 }} /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
