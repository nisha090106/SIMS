import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Warehouse as BrandIcon,
  PersonOutline as ProfileIcon,
  LogoutOutlined as LogoutIcon,
  HomeOutlined as HomeIcon,
  StorefrontOutlined as CatalogIcon,
  AssignmentOutlined as RequestsIcon,
} from '@mui/icons-material';
import Badge from '../components/ui/Badge';
import { logout } from '../store/authSlice';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';

const NAV_LINKS = [
  { path: '/user-dashboard',   label: 'Home',        icon: HomeIcon },
  { path: '/user/catalog',     label: 'Catalog',     icon: CatalogIcon },
  { path: '/user/my-requests', label: 'My Requests', icon: RequestsIcon },
];

const RequesterLayout = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { showToast } = useToast();
  const { user }  = useSelector((state) => state.auth);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fullName = user?.full_name || user?.name || 'Requester';
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

  const handleLogout = async () => {
    setDropdownOpen(false);
    try { await authAPI.logout(); } catch { /* silent */ }
    dispatch(logout());
    showToast('Logged out successfully', 'success');
    navigate('/login');
  };

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  const activeLinkStyle = {
    color: 'var(--color-primary)',
    fontWeight: 600,
    borderBottom: '2px solid var(--color-primary)',
  };

  const defaultLinkStyle = {
    color: 'var(--color-text-secondary)',
    fontWeight: 500,
    borderBottom: '2px solid transparent',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Top navigation bar ── */}
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
          gap: 0,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <NavLink
          to="/user-dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            textDecoration: 'none',
            marginRight: 32,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrandIcon style={{ fontSize: 16, color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              SIMS
            </span>
            <Badge variant="primary" size="sm">Request Portal</Badge>
          </div>
        </NavLink>

        {/* Nav links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'stretch',
            height: '100%',
            flex: 1,
            gap: 0,
          }}
        >
          {NAV_LINKS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 14px',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-sans)',
                transition: 'color var(--transition-base)',
                boxSizing: 'border-box',
                ...(isActive ? activeLinkStyle : defaultLinkStyle),
              })}
              onMouseEnter={(e) => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                if (!isActive) e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <Icon style={{ fontSize: 16 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Avatar dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
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
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {getInitials(fullName)}
            </div>
            <span
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {fullName.split(' ')[0]}
            </span>
            <span
              style={{
                fontSize: 9,
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
                width: 210,
                padding: 6,
                zIndex: 1200,
                animation: 'req-dd-in 0.14s ease',
              }}
            >
              {/* Info block */}
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
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {email}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Badge variant="success" size="sm">Requester</Badge>
                </div>
              </div>

              <DDItem
                icon={<ProfileIcon style={{ fontSize: 15 }} />}
                label="Profile"
                onClick={() => { setDropdownOpen(false); }}
              />
              <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
              <DDItem
                icon={<LogoutIcon style={{ fontSize: 15 }} />}
                label="Sign Out"
                danger
                onClick={handleLogout}
              />
            </div>
          )}
        </div>
      </header>

      {/* ── Page content ── */}
      <main
        style={{
          flex: 1,
          padding: '28px 32px',
          boxSizing: 'border-box',
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '14px 32px',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
          background: 'var(--color-surface)',
        }}
      >
        © {new Date().getFullYear()} Smart Inventory Management System. All rights reserved.
      </footer>

      <style>{`
        @keyframes req-dd-in {
          from { opacity:0; transform:translateY(6px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>
    </div>
  );
};

const DDItem = ({ icon, label, onClick, danger = false }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: '100%',
      border: 'none',
      background: 'none',
      padding: '8px 12px',
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
    <span style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)', display: 'flex' }}>
      {icon}
    </span>
    {label}
  </button>
);

export default RequesterLayout;
