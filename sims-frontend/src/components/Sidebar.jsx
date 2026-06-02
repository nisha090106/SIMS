import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
} from '@mui/icons-material';
import '../styles/Sidebar.css';

const Sidebar = ({ isCollapsed, toggleCollapse }) => {
  const location = useLocation();

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/products', label: 'Products', icon: <InventoryIcon /> },
    { path: '/inventory', label: 'Inventory', icon: <WarehouseIcon /> },
    { path: '/warehouses', label: 'Warehouses', icon: <StoreIcon /> },
    { path: '/suppliers', label: 'Suppliers', icon: <PeopleIcon /> },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: <ShoppingCartIcon /> },
    { path: '/sales-orders', label: 'Sales Orders', icon: <ReceiptIcon /> },
    { path: '/reports', label: 'Reports', icon: <BarChartIcon /> },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon-container">
            <WarehouseIcon className="logo-icon" />
          </div>
          {!isCollapsed && <span className="logo-text">SIMS</span>}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle at Bottom */}
      <div className="sidebar-footer">
        <button className="sidebar-toggle" onClick={toggleCollapse} title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          {!isCollapsed && <span className="toggle-text">Collapse Menu</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
