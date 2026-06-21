import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  NotificationsNone as BellIcon,
  Notifications as BellFilledIcon,
  PersonOutline as ProfileIcon,
  SettingsOutlined as SettingsIcon,
  LogoutOutlined as LogoutIcon,
  ChevronRight as ChevronIcon,
  DoneAll as DoneAllIcon,
  DeleteSweep as ClearIcon,
  OpenInNew as OpenIcon,
  Circle as DotIcon,
} from '@mui/icons-material';
import Badge from '../components/ui/Badge';
import { logout } from '../store/authSlice';
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
  deleteNotification,
} from '../store/notificationsSlice';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';

/* ── Route → breadcrumb ── */
const BREADCRUMBS = {
  '/dashboard': ['Dashboard'],
  '/products': ['Products'],
  '/inventory': ['Inventory'],
  '/warehouses': ['Warehouses'],
  '/suppliers': ['Suppliers'],
  '/purchase-orders': ['Purchase Orders'],
  '/sales-orders': ['Sales Orders'],
  '/reports': ['Reports'],
  '/settings': ['Settings'],
  '/requests': ['Requests'],
  '/barcode': ['Barcode'],
  '/import-center': ['Bulk Import'],
  '/automation': ['Automation'],
  '/notifications': ['Notifications'],
  '/user-dashboard': ['My Dashboard'],
  '/user/catalog': ['Catalog'],
  '/user/my-requests': ['My Requests'],
};

const ROLE_BADGE = { admin: 'danger', manager: 'warning', staff: 'info', user: 'success' };

/* ── Type → colour accent ── */
const TYPE_COLOR = {
  po_created: '#3b82f6',
  po_submitted: '#0891b2',
  po_approved: '#16a34a',
  po_shipped: '#d97706',
  po_received: '#16a34a',
  po_cancelled: '#dc2626',
  po_auto_drafted: '#7c3aed',
  request_created: '#0891b2',
  request_approved: '#16a34a',
  request_rejected: '#dc2626',
  request_fulfilled: '#16a34a',
  request_cancelled: '#64748b',
  low_stock_auto_po: '#d97706',
  nightly_sync_summary: '#6366f1',
};

function typeColor(type) {
  return TYPE_COLOR[type] || '#64748b';
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ══════════════════════════════════════════════════════════════
   NotificationDropdown
══════════════════════════════════════════════════════════════ */
function NotificationDropdown({ onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { recent, unreadCount, loading } = useSelector((s) => s.notifications);

  // Load recent on mount
  useEffect(() => {
    dispatch(fetchNotifications({ page: 1, limit: 10 }));
  }, [dispatch]);

  const handleClick = (n) => {
    if (!n.is_read) dispatch(markNotificationRead(n.id));
    if (n.link) {
      navigate(n.link);
      onClose();
    }
  };

  const handleMarkAll = () => dispatch(markAllNotificationsRead());
  const handleClear = () => dispatch(clearReadNotifications());
  const handleDelete = (e, id) => {
    e.stopPropagation();
    dispatch(deleteNotification(id));
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: -8,
        width: 360,
        maxHeight: 480,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'topbar-dd-in 0.15s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)',
            }}
          >
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                background: 'var(--color-danger)',
                color: '#fff',
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                lineHeight: '16px',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {unreadCount > 0 && (
            <ActionBtn title='Mark all read' onClick={handleMarkAll}>
              <DoneAllIcon style={{ fontSize: 16 }} />
            </ActionBtn>
          )}
          <ActionBtn title='Clear read' onClick={handleClear}>
            <ClearIcon style={{ fontSize: 16 }} />
          </ActionBtn>
          <ActionBtn
            title='View all'
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
          >
            <OpenIcon style={{ fontSize: 15 }} />
          </ActionBtn>
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && recent.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 13,
            }}
          >
            Loading…
          </div>
        ) : recent.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <BellIcon
              style={{
                fontSize: 36,
                color: 'var(--color-border)',
                display: 'block',
                margin: '0 auto 8px',
              }}
            />
            <p
              style={{
                margin: 0,
                color: 'var(--color-text-muted)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
              }}
            >
              You're all caught up
            </p>
          </div>
        ) : (
          recent.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              onClick={() => handleClick(n)}
              onDelete={(e) => handleDelete(e, n.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '10px 16px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => {
            navigate('/notifications');
            onClose();
          }}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-sans)',
            padding: '4px 0',
            textAlign: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          View notification history →
        </button>
      </div>
    </div>
  );
}

function NotificationRow({ n, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const color = typeColor(n.type);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 12,
        padding: '11px 16px',
        cursor: n.link ? 'pointer' : 'default',
        background: hovered
          ? 'var(--color-surface-alt)'
          : !n.is_read
            ? 'rgba(37,99,235,0.03)'
            : 'transparent',
        borderBottom: '1px solid var(--color-border)',
        position: 'relative',
        transition: 'background 0.1s',
      }}
    >
      {/* Unread dot */}
      {!n.is_read && (
        <span
          style={{
            position: 'absolute',
            top: 14,
            left: 6,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--color-primary)',
          }}
        />
      )}

      {/* Type colour bar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          flexShrink: 0,
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          marginTop: 2,
        }}
      >
        <span>{n.title?.slice(0, 2) || '🔔'}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: n.is_read ? 500 : 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {n.title}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {n.message}
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 11,
            color: '#000000',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {relativeTime(n.created_at)}
        </p>
      </div>

      {/* Delete button */}
      {hovered && (
        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#000000',
            padding: '2px 4px',
            borderRadius: 4,
            fontSize: 14,
            lineHeight: 1,
            flexShrink: 0,
            alignSelf: 'flex-start',
            marginTop: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          title='Delete'
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ActionBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 6,
        padding: 0,
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-alt)';
        e.currentTarget.style.color = 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = 'var(--color-text-secondary)';
      }}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Topbar
══════════════════════════════════════════════════════════════ */
const POLL_INTERVAL = 30_000; // 30 seconds

const Topbar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const { user } = useSelector((s) => s.auth);
  const { unreadCount } = useSelector((s) => s.notifications);
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const fullName = user?.full_name || user?.name || 'User';
  const role = user?.role || 'staff';
  const email = user?.email || '';

  /* ── Poll unread count ── */
  const pollCount = useCallback(() => {
    if (isAuthenticated) dispatch(fetchUnreadCount());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    pollCount();
    const id = setInterval(pollCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [pollCount]);

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Re-poll when bell opens ── */
  const handleBellClick = () => {
    setBellOpen((v) => !v);
    if (!bellOpen) dispatch(fetchUnreadCount());
  };

  const crumbs = BREADCRUMBS[location.pathname] || ['SIMS'];

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      await authAPI.logout();
    } catch {
      /* silent */
    }
    dispatch(logout());
    showToast('Logged out successfully', 'success');
    navigate('/login');
  };

  const getInitials = (name = '') =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

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
      {/* Hamburger */}
      <button
        onClick={onToggle}
        aria-label='Toggle sidebar'
        style={iconBtnStyle}
        onMouseEnter={iconBtnHover}
        onMouseLeave={iconBtnLeave}
      >
        <MenuIcon style={{ fontSize: 20 }} />
      </button>

      {/* Breadcrumb */}
      <nav
        aria-label='Breadcrumb'
        style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}
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
                  i === crumbs.length - 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
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

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Search */}
        <button
          aria-label='Search'
          style={iconBtnStyle}
          onMouseEnter={iconBtnHover}
          onMouseLeave={iconBtnLeave}
        >
          <SearchIcon style={{ fontSize: 20 }} />
        </button>

        {/* Bell */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            aria-label='Notifications'
            aria-expanded={bellOpen}
            onClick={handleBellClick}
            style={{ ...iconBtnStyle, position: 'relative' }}
            onMouseEnter={iconBtnHover}
            onMouseLeave={iconBtnLeave}
          >
            {unreadCount > 0 ? (
              <BellFilledIcon style={{ fontSize: 20, color: 'var(--color-primary)' }} />
            ) : (
              <BellIcon style={{ fontSize: 20 }} />
            )}
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 99,
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  lineHeight: '16px',
                  textAlign: 'center',
                  padding: '0 3px',
                  border: '1.5px solid var(--color-surface)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && <NotificationDropdown onClose={() => setBellOpen(false)} />}
        </div>

        {/* User avatar + dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', marginLeft: 8 }}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup='true'
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
                  <Badge variant={ROLE_BADGE[role] || 'neutral'} size='sm'>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                </div>
              </div>
              <DropdownItem
                icon={<ProfileIcon style={{ fontSize: 16 }} />}
                label='Profile'
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
              />
              <DropdownItem
                icon={<SettingsIcon style={{ fontSize: 16 }} />}
                label='Settings'
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
              />
              <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
              <DropdownItem
                icon={<LogoutIcon style={{ fontSize: 16 }} />}
                label='Sign Out'
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

/* ── Shared styles ── */
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
    onMouseEnter={(e) =>
      (e.currentTarget.style.background = danger
        ? 'var(--color-danger-soft)'
        : 'var(--color-surface-alt)')
    }
    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
  >
    <span
      style={{
        color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)',
        display: 'flex',
      }}
    >
      {icon}
    </span>
    {label}
  </button>
);

export default Topbar;
