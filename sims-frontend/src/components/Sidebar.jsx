import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Warehouse as WarehouseIcon,
  Store as StoreIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Assignment as AssignmentIcon,
  Upload as UploadIcon,
  AutoMode as AutoModeIcon,
} from '@mui/icons-material';
import { requestAPI } from '../services/api';
import '../styles/Sidebar.css';

const Sidebar = ({ isCollapsed, toggleCollapse }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const role = user?.role;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role === 'admin' || role === 'manager') {
      const fetchPendingCount = async () => {
        try {
          const res = await requestAPI.getAll({ status: 'pending', limit: 1 });
          if (res.data && res.data.success) {
            setPendingCount(res.data.total || 0);
          }
        } catch (err) {
          console.error('Failed to fetch pending requests count', err);
        }
      };

      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30 * 1000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [role]);

  const baseNavigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/products', label: 'Products', icon: <InventoryIcon /> },
    { path: '/inventory', label: 'Inventory', icon: <WarehouseIcon /> },
    { path: '/warehouses', label: 'Warehouses', icon: <StoreIcon /> },
    { path: '/suppliers', label: 'Suppliers', icon: <PeopleIcon /> },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: <ShoppingCartIcon /> },
    { path: '/sales-orders', label: 'Sales Orders', icon: <ReceiptIcon /> },
  ];

  // Dynamically build navigation items
  const navigationItems = [...baseNavigationItems];
  
  if (role === 'admin' || role === 'manager') {
    navigationItems.push(
      { 
        path: '/requests', 
        label: 'User Requests', 
        icon: <AssignmentIcon /> 
      },
      { 
        path: '/import-center', 
        label: 'Import Center', 
        icon: <UploadIcon /> 
      },
      { 
        path: '/automation', 
        label: 'Automation', 
        icon: <AutoModeIcon /> 
      }
    );
  }

  navigationItems.push(
    { path: '/reports', label: 'Reports', icon: <BarChartIcon /> },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon /> }
  );

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className='sidebar-header'>
        <div className='sidebar-logo'>
          <div className='logo-icon-container'>
            <WarehouseIcon className='logo-icon' />
          </div>
          {!isCollapsed && <span className='logo-text'>SIMS</span>}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className='sidebar-nav'>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <span className='nav-icon'>
                {item.icon}
                {item.path === '/requests' && pendingCount > 0 && isCollapsed && (
                  <span className='nav-icon-badge-dot' />
                )}
              </span>
              {!isCollapsed && <span className='nav-label'>{item.label}</span>}
              {!isCollapsed && item.path === '/requests' && pendingCount > 0 && (
                <span className='nav-label-badge'>{pendingCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle at Bottom */}
      <div className='sidebar-footer'>
        <button
          className='sidebar-toggle'
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          {!isCollapsed && <span className='toggle-text'>Collapse Menu</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
