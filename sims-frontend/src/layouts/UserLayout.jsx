/**
 * UserLayout — legacy compatibility shim.
 *
 * New code uses RequesterLayout (Outlet pattern).
 * This shim renders children inside a simplified top-nav shell
 * so any page still using <UserLayout><Page /></UserLayout> continues to work.
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Warehouse as LogoIcon,
  Logout as LogoutIcon,
  ShoppingBag as CatalogIcon,
  ListAlt as MyRequestsIcon,
  Dashboard as HomeIcon,
} from '@mui/icons-material';
import { logout } from '../store/authSlice';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import Badge from '../components/ui/Badge';

const UserLayout = ({ children }) => {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.name ||
    'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      /* silent */
    }
    dispatch(logout());
    showToast('Logged out successfully', 'success');
    navigate('/login');
  };

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '6px 14px',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-base)',
    fontWeight: isActive ? 600 : 500,
    fontFamily: 'var(--font-sans)',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-primary-soft)' : 'transparent',
    textDecoration: 'none',
    transition: 'background var(--transition-base), color var(--transition-base)',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <header
        style={{
          height: 60,
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <NavLink
            to='/user-dashboard'
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogoIcon style={{ fontSize: 16, color: '#fff' }} />
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
                textTransform: 'uppercase',
              }}
            >
              SIMS
            </span>
            <Badge variant='primary' size='sm'>
              Portal
            </Badge>
          </NavLink>

          <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
            {[
              { to: '/user-dashboard', label: 'Home', icon: HomeIcon },
              { to: '/user/catalog', label: 'Catalog', icon: CatalogIcon },
              { to: '/user/my-requests', label: 'My Requests', icon: MyRequestsIcon },
            ].map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} style={linkStyle}>
                <Icon style={{ fontSize: 15 }} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {initials}
            </div>
            <span
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {displayName.split(' ')[0]}
            </span>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-sans)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-danger)';
                e.currentTarget.style.background = 'var(--color-danger-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.background = 'none';
              }}
            >
              <LogoutIcon style={{ fontSize: 16 }} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          padding: '28px 24px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
          background: 'var(--color-surface)',
        }}
      >
        © {new Date().getFullYear()} Smart Inventory Management System
      </footer>
    </div>
  );
};

export default UserLayout;
