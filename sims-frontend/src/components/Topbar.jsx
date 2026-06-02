import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { logout } from '../store/authSlice';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/Topbar.css';

const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { user } = useSelector((state) => state.auth);

  // Extract user info
  const fullName = user?.full_name || user?.name || 'User';
  const role = user?.role || 'Staff';

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

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/products':
        return 'Products';
      case '/inventory':
        return 'Inventory';
      case '/warehouses':
        return 'Warehouses';
      case '/suppliers':
        return 'Suppliers';
      case '/purchase-orders':
        return 'Purchase Orders';
      case '/sales-orders':
        return 'Sales Orders';
      case '/reports':
        return 'Reports';
      case '/settings':
        return 'Settings';
      default:
        return 'SIMS';
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-content">
        {/* Page Title */}
        <div className="topbar-left">
          <h1 className="page-title">{getPageTitle()}</h1>
        </div>

        {/* Actions Menu */}
        <div className="topbar-right">
          {/* Search Bar (UI Placeholder) */}
          <div className="topbar-search">
            <SearchIcon className="search-icon" />
            <input type="text" placeholder="Search products, orders, activity..." disabled />
          </div>

          {/* Notification Bell */}
          <div className="notification-bell">
            <button className="icon-button" title="Notifications">
              <NotificationsIcon />
              <span className="bell-badge">3</span>
            </button>
          </div>

          {/* User Menu */}
          <div className="user-menu">
            <button className="user-button" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div className="user-avatar">{getInitials(fullName)}</div>
              <div className="user-text-info">
                <span className="user-name">{fullName}</span>
                <span className="user-role">{role}</span>
              </div>
              <span className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`}>▼</span>
            </button>

            {isDropdownOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}>
                  <PersonIcon className="dropdown-item-icon" />
                  Profile Details
                </button>
                <button className="dropdown-item" onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}>
                  <SettingsIcon className="dropdown-item-icon" />
                  System Settings
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  <LogoutIcon className="dropdown-item-icon" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
