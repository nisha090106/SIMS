import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Warehouse as WarehouseIcon,
  ListAlt as ListAltIcon,
  ShoppingCart as ShoppingCartIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { logout } from '../store/authSlice';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/UserLayout.css';

const UserLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const { user } = useSelector((state) => state.auth);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fullName = user?.full_name || user?.name || 'Requester';
  const email = user?.email || '';

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Backend logout call skipped or failed:', error.message);
    } finally {
      dispatch(logout());
      showToast('Logged out successfully', 'success');
      navigate('/login');
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleNavClick = (path) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className='user-layout'>
      {/* Top Navigation Bar */}
      <nav className='user-navbar'>
        <div className='navbar-container'>
          {/* Left: Brand Logo */}
          <div className='navbar-brand' onClick={() => handleNavClick('/user-dashboard')}>
            <div className='brand-icon-box'>
              <WarehouseIcon className='brand-logo-icon' />
            </div>
            <span className='brand-name'>
              SIMS <span className='brand-badge'>Request</span>
            </span>
          </div>

          {/* Mobile Menu Button */}
          <button
            className='mobile-menu-toggle'
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label='Toggle menu'
          >
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          {/* Middle: Navigation Links */}
          <div className={`navbar-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <button
              className={`nav-link-item ${isActive('/user-dashboard') ? 'active' : ''}`}
              onClick={() => handleNavClick('/user-dashboard')}
            >
              <WarehouseIcon className='nav-item-icon' />
              <span>Overview</span>
            </button>
            <button
              className={`nav-link-item ${isActive('/user/catalog') ? 'active' : ''}`}
              onClick={() => handleNavClick('/user/catalog')}
            >
              <ShoppingCartIcon className='nav-item-icon' />
              <span>Browse Catalog</span>
            </button>
            <button
              className={`nav-link-item ${isActive('/user/my-requests') ? 'active' : ''}`}
              onClick={() => handleNavClick('/user/my-requests')}
            >
              <ListAltIcon className='nav-item-icon' />
              <span>My Requests</span>
            </button>
          </div>

          {/* Right: Actions (Notification & User Profile) */}
          <div className='navbar-actions'>
            {/* Notification Bell */}
            <div className='notification-bell-container'>
              <button className='nav-action-btn' title='Notifications'>
                <NotificationsIcon />
                <span className='action-badge-dot'></span>
              </button>
            </div>

            {/* User Dropdown */}
            <div className='user-dropdown-container'>
              <button
                className='user-profile-btn'
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className='avatar-circle'>{getInitials(fullName)}</div>
                <span className='profile-name-text'>{fullName.split(' ')[0]}</span>
                <span className={`chevron-indicator ${isDropdownOpen ? 'open' : ''}`}>▼</span>
              </button>

              {isDropdownOpen && (
                <div className='user-nav-dropdown'>
                  <div className='dropdown-user-info'>
                    <div className='info-name'>{fullName}</div>
                    <div className='info-email'>{email}</div>
                    <div className='info-role-badge'>Requester</div>
                  </div>
                  <hr className='dropdown-divider' />
                  <button
                    className='dropdown-nav-item'
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleNavClick('/user-dashboard');
                    }}
                  >
                    <PersonIcon className='item-icon' />
                    <span>My Dashboard</span>
                  </button>
                  <hr className='dropdown-divider' />
                  <button className='dropdown-nav-item logout-btn' onClick={handleLogout}>
                    <LogoutIcon className='item-icon' />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Page Content */}
      <main className='user-main-content'>
        <div className='user-content-container'>{children}</div>
      </main>

      {/* Footer */}
      <footer className='user-footer'>
        <div className='footer-container'>
          <p>
            &copy; {new Date().getFullYear()} Smart Inventory Management System. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default UserLayout;
