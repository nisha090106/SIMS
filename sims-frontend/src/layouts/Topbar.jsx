import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  NotificationsNone as BellIcon,
  PersonOutline as ProfileIcon,
  SettingsOutlined as SettingsIcon,
  LogoutOutlined as LogoutIcon,
  ChevronRight as ChevronIcon,
} from '@mui/icons-material';
import Badge from '../components/ui/Badge';
import { logout } from '../store/authSlice';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';

/* ── Route → breadcrumb label map ── */
const BREADCRUMBS = {
  '/dashboard':        ['Dashboard'],
  '/products':         ['Products'],
  '/inventory':        ['Inventory'],
  '/warehouses':       ['Warehouses'],
  '/suppliers':        ['Suppliers'],
  '/purchase-orders':  ['Purchase Orders'],
  '/sales-orders':     ['Sales Orders'],
  '/reports':          ['Reports'],
  '/settings':         ['Settings'],
  '/requests':         ['Requests'],
  '/barcode':          ['Barcode'],
  '/import-center':    ['Bulk Import'],
  '/automation':       ['Automation'],
  '/user-dashboard':   ['My Dashboard'],
  '/user/catalog':     ['Catalog'],
  '/user/my-requests': ['My Requests'],
};

const ROLE_BADGE = {
  admin:   'danger',
  manager: 'warning',
  staff:   'info',
  user:    'success',
};

const Topbar = ({ collapsed, onToggle }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { showToast } = useToast();
  const { user }  = useSelector((state) => state.auth);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fullName = user?.full_name || user?.name || 'User';
  const role     = user?.role || 'staff';
  const email    = user?.email || '';

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const crumbs = BREADCRUMBS[location.pathname] || ['SIMS'];

  const handleLogout = async () => {
    setDropdownOpen(false);
    try { await authAPI.logout(); } catch { /* silent */ }
    dispatch(logout());
    showToast('Logged out successfully', 'success');
    navigate('/login');
  };

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        height: 'var(--topbar-height)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* ── Hamburger ── */}
      <button
        onClick={onToggle}
        aria-label="Toggle sidebar"
        style={iconBtnStyle}
        onMouseEnter={iconBtnHover}
        onMouseLeave={iconBtnLeave}
      >
        <MenuIcon style={{ fontSize: 20 }} />
      </button>

      {/* ── Breadcrumb ── */}
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          SIMS
        </span>
        {crumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <ChevronIcon style={{ fontSize: 14, color: 'var(--color-text-muted)' }} />
            <span
              style={{
                fontSize: i === crumbs.length - 1 ? 'var(--text-base)' : 'var(--text-sm)',
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
                color:
                  i === crumbs.length - 1
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-muted)',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* ── Right actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Search icon */}
        <button
          aria-label="Search"
          style={iconBtnStyle}
          onMouseEnter={iconBtnHover}
          onMouseLeave={iconBtnLeave}
        >
          <SearchIcon style={{ fontSize: 20 }} />
        </button>

        {/* Notification bell */}
        <button
          aria-label="Notifications"
          style={{ ...iconBtnStyle, position: 'relative' }}
          onMouseEnter={iconBtnHover}
          onMouseLeave={iconBtnLeave}
        >
          <BellIcon style={{ fontSize: 20 }} />
          {/* Static indicator — wire to real notification count later */}
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              background: 'var(--color-danger)',
              borderRadius: '50%',
              border: '1.5px solid var(--color-surface)',
            }}
          />
        </button>

        {/* User avatar + dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', marginLeft: 8 }}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 'var(--radius-md)',
              transition: 'background var(--transition-base)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'var(--font-sans)',
                flexShrink: 0,
              }}
            >
              {getInitials(fullName)}
            </div>

            {/* Name + role */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                }}
              >
                {fullName.split(' ')[0]}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                  marginTop: 2,
                  textTransform: 'capitalize',
                }}
              >
                {role}
              </span>
            </div>

            <span
              style={{
                fontSize: 10,
                color: 'var(--color-text-muted)',
                transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--transition-base)',
                lineHeight: 1,
              }}
            >
              ▼
            </span>
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-dropdown)',
                width: 220,
                padding: 6,
                zIndex: 1200,
                animation: 'topbar-dd-in 0.15s ease',
              }}
            >
              {/* User info block */}
              <div
                style={{
                  padding: '10px 12px 8px',
                  borderBottom: '1px solid var(--color-border)',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fullName}
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-sans)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 1,
                  }}
                >
                  {email}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Badge variant={ROLE_BADGE[role] || 'neutral'} size="sm">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                </div>
              </div>

              <DropdownItem
                icon={<ProfileIcon style={{ fontSize: 16 }} />}
                label="Profile"
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
              />
              <DropdownItem
                icon={<SettingsIcon style={{ fontSize: 16 }} />}
                label="Settings"
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
              />

              <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

              <DropdownItem
                icon={<LogoutIcon style={{ fontSize: 16 }} />}
                label="Sign Out"
                danger
                onClick={handleLogout}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes topbar-dd-in {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </header>
  );
};

/* ── Helpers ── */
const iconBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 'var(--radius-md)',
  transition: 'background var(--transition-base), color var(--transition-base)',
  padding: 0,
  flexShrink: 0,
};

const iconBtnHover = (e) => {
  e.currentTarget.style.background = 'var(--color-surface-alt)';
  e.currentTarget.style.color = 'var(--color-text-primary)';
};

const iconBtnLeave = (e) => {
  e.currentTarget.style.background = 'none';
  e.currentTarget.style.color = 'var(--color-text-secondary)';
};

const DropdownItem = ({ icon, label, onClick, danger = false }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: '100%',
      border: 'none',
      background: 'none',
      padding: '9px 12px',
      borderRadius: 'var(--radius-md)',
      fontSize: 'var(--text-base)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background var(--transition-base)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = danger
        ? 'var(--color-danger-soft)'
        : 'var(--color-surface-alt)';
    }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
  >
    <span style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)', display:'flex' }}>
      {icon}
    </span>
    {label}
  </button>
);

export default Topbar;
