import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Inventory as InventoryIcon,
  AttachMoney as AttachMoneyIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  AddCircle as AddCircleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { reportAPI, inventoryAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashResponse, lowStockResponse] = await Promise.all([
        reportAPI.getDashboard(),
        inventoryAPI.getLowStock(),
      ]);

      if (dashResponse.data?.success) {
        setDashboardData(dashResponse.data.data);
      } else {
        setDashboardData(dashResponse.data);
      }

      if (lowStockResponse.data?.success) {
        setLowStockItems(lowStockResponse.data.data.slice(0, 5));
      } else {
        setLowStockItems((lowStockResponse.data || []).slice(0, 5));
      }
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.error || 'Failed to sync dashboard metrics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format dates nicely
  const formatActivityTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Activity Feed Icon Mapper
  const getActivityIcon = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATE')) return <AddCircleIcon className="activity-icon create" />;
    if (act.includes('UPDATE')) return <EditIcon className="activity-icon update" />;
    if (act.includes('DELETE')) return <DeleteIcon className="activity-icon delete" />;
    if (act.includes('LOGIN')) return <LoginIcon className="activity-icon login" />;
    if (act.includes('LOGOUT')) return <LogoutIcon className="activity-icon logout" />;
    return <InfoIcon className="activity-icon default" />;
  };

  // Chart Color Palette
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

  if (isLoading) {
    return (
      <div className="dashboard-container">
        {/* Header Skeleton */}
        <div className="dashboard-header">
          <div className="skeleton title-skeleton"></div>
          <div className="skeleton button-skeleton"></div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="metrics-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="metric-card skeleton-card">
              <div className="metric-header">
                <div className="skeleton circle-skeleton"></div>
                <div className="skeleton text-skeleton short"></div>
              </div>
              <div className="skeleton text-skeleton long"></div>
              <div className="skeleton badge-skeleton"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="charts-section">
          <div className="chart-card skeleton-card">
            <div className="skeleton text-skeleton short" style={{ marginBottom: '20px' }}></div>
            <div className="skeleton chart-skeleton"></div>
          </div>
          <div className="chart-card skeleton-card">
            <div className="skeleton text-skeleton short" style={{ marginBottom: '20px' }}></div>
            <div className="skeleton chart-skeleton"></div>
          </div>
        </div>

        {/* Table & Activity Skeleton */}
        <div className="dashboard-split-row">
          <div className="table-card skeleton-card">
            <div className="skeleton text-skeleton short" style={{ marginBottom: '20px' }}></div>
            <div className="skeleton table-row-skeleton"></div>
            <div className="skeleton table-row-skeleton"></div>
            <div className="skeleton table-row-skeleton"></div>
          </div>
          <div className="activity-card skeleton-card">
            <div className="skeleton text-skeleton short" style={{ marginBottom: '20px' }}></div>
            <div className="skeleton list-item-skeleton"></div>
            <div className="skeleton list-item-skeleton"></div>
            <div className="skeleton list-item-skeleton"></div>
          </div>
        </div>
      </div>
    );
  }

  // Loaded UI Metrics
  const metrics = [
    {
      title: 'Total Products',
      value: dashboardData?.totalProducts || 0,
      icon: <InventoryIcon />,
      colorClass: 'blue',
      change: '+4.5%',
      isPositive: true,
    },
    {
      title: 'Total Stock Value',
      value: `$${(dashboardData?.totalStockValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <AttachMoneyIcon />,
      colorClass: 'green',
      change: '+12.3%',
      isPositive: true,
    },
    {
      title: 'Low Stock Items',
      value: dashboardData?.lowStockCount || 0,
      icon: <WarningIcon />,
      colorClass: 'orange',
      change: '-1.8%',
      isPositive: false,
    },
    {
      title: 'Pending Orders',
      value: dashboardData?.pendingOrdersCount || 0,
      icon: <AssignmentIcon />,
      colorClass: 'purple',
      change: '+2',
      isPositive: true,
      isNumberBadge: true,
    },
  ];

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-main-title">Overview Dashboard</h1>
          <p className="dashboard-subtitle">Real-time inventory and warehousing health status</p>
        </div>
        <button className="refresh-btn" onClick={fetchDashboardData}>
          <RefreshIcon className="btn-icon" />
          Refresh Stats
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className={`metric-card border-${metric.colorClass}`}>
            <div className="metric-header">
              <div className={`metric-icon-wrapper ${metric.colorClass}`}>
                {metric.icon}
              </div>
              <h3 className="metric-title">{metric.title}</h3>
            </div>
            <div className="metric-content">
              <span className="metric-value">{metric.value}</span>
              <span className={`metric-badge ${metric.isPositive ? 'positive' : 'negative'}`}>
                {metric.isPositive ? <ArrowUpwardIcon className="badge-arrow" /> : <ArrowDownwardIcon className="badge-arrow" />}
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Stock by Warehouse Bar Chart */}
        <div className="chart-card">
          <h2 className="chart-title">Stock Quantity by Warehouse</h2>
          <div className="chart-container-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData?.warehouseStockData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="warehouse" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar name="Total Stock Units" dataKey="totalStock" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="chart-card">
          <h2 className="chart-title">Product Category Distribution</h2>
          <div className="chart-container-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData?.categoryDistribution || []}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  outerRadius={85}
                  dataKey="count"
                  nameKey="category"
                  label={({ category, count }) => `${category} (${count})`}
                >
                  {(dashboardData?.categoryDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Splitted Row: Low Stock Alerts & Recent Activity Feed */}
      <div className="dashboard-split-row">
        {/* Low Stock Alerts */}
        <div className="table-card">
          <div className="table-card-header">
            <h2 className="table-title">Low Stock Alerts</h2>
            <Link to="/inventory" className="view-all-link">View All</Link>
          </div>
          <div className="table-responsive">
            <table className="items-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item, index) => {
                    const sku = item.sku;
                    const name = item.name || item.productName || item.product?.name;
                    const category = item.category || item.product?.category || 'General';
                    const quantity = item.quantity !== undefined ? item.quantity : item.currentStock;
                    const reorderLevel = item.reorder_level !== undefined ? item.reorder_level : item.reorderLevel;
                    const warehouseName = item.warehouse_name || item.warehouse || 'Main';
                    const isOutOfStock = quantity === 0;

                    return (
                      <tr key={index}>
                        <td className="sku-cell">{sku}</td>
                        <td className="name-cell">{name}</td>
                        <td><span className="category-tag">{category}</span></td>
                        <td className={`stock-cell ${isOutOfStock ? 'danger' : 'warning'}`}>{quantity}</td>
                        <td>{reorderLevel}</td>
                        <td className="warehouse-cell">{warehouseName}</td>
                        <td>
                          <span className={`status-badge ${isOutOfStock ? 'critical' : 'low'}`}>
                            {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                        <td>
                          <button className="action-btn" title="Create Purchase Order Placeholder">
                            Create PO
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No low stock alerts detected. All warehouse stock is healthy!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Audit Log Activity */}
        <div className="activity-card">
          <h2 className="table-title">Recent System Activity</h2>
          <div className="activity-feed">
            {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
              dashboardData.recentActivity.map((log, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon-container">
                    {getActivityIcon(log.action)}
                  </div>
                  <div className="activity-details">
                    <span className="activity-text">{log.action}</span>
                    <div className="activity-meta">
                      <span className="activity-user">By {log.user}</span>
                      <span className="activity-dot">•</span>
                      <span className="activity-time">{formatActivityTime(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity-data">
                No recent activity logs recorded in the system.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
