import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReportViewer from './ReportViewer';
import api from '../../services/api';

const PurchaseOrderReport = () => {
  const [filters, setFilters] = useState({
    supplierId: '',
    warehouseId: '',
    status: '',
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const userRole = localStorage.getItem('userRole') || 'staff';

  useEffect(() => {
    fetchSuppliers();
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch suppliers');
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch warehouses');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/reports/purchase-orders', { params: filters });
      setData(response.data.data.items || []);
      
      const apiSummary = response.data.data.summary || {};
      setSummary({
        totalPOs: apiSummary.totalPOs || 0,
        totalValue: apiSummary.totalValue || 0,
        avgLeadTimeDays: apiSummary.avgLeadTime !== undefined ? apiSummary.avgLeadTime : 'N/A',
        onTimeDeliveryRate: apiSummary.onTimeDeliveryRate !== undefined ? `${apiSummary.onTimeDeliveryRate}%` : 'N/A',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/reports/export/purchase-orders`, {
        params: { format, ...filters },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `purchase-orders-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export report');
    }
  };

  const getMonthlyTrend = () => {
    const monthlyData = {};
    data.forEach(po => {
      if (!po.orderDate) return;
      const date = new Date(po.orderDate);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[yearMonth] = (monthlyData[yearMonth] || 0) + (po.value || 0);
    });

    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, value]) => ({
        month,
        value: parseFloat(value.toFixed(2)),
      }));
  };

  const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'received':
        return 'success';
      case 'shipped':
        return 'info';
      case 'approved':
        return 'primary';
      case 'submitted':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    { field: 'poNumber', label: 'PO#' },
    { field: 'supplier', label: 'Supplier' },
    { field: 'items', label: 'Total Items Qty', align: 'right' },
    { field: 'value', label: 'Total Value', align: 'right', render: (v) => `$${v.toFixed(2)}` },
    {
      field: 'status',
      label: 'Status',
      render: (v) => (
        <Chip
          label={v?.toUpperCase()}
          color={getStatusChipColor(v)}
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    {
      field: 'orderDate',
      label: 'Order Date',
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      field: 'receivedDate',
      label: 'Received Date',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
  ];

  const trendData = getMonthlyTrend();

  return (
    <ReportViewer
      title="Purchase Order Report"
      filters={filters}
      onFiltersChange={setFilters}
      loading={loading}
      error={error}
      data={data}
      summary={summary}
      columns={columns}
      onExport={handleExport}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Supplier</InputLabel>
          <Select
            value={filters.supplierId}
            onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
            label="Supplier"
          >
            <MenuItem value="">All Suppliers</MenuItem>
            {suppliers.map(sup => (
              <MenuItem key={sup.supplier_id} value={sup.supplier_id}>
                {sup.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {userRole === 'admin' && (
          <FormControl fullWidth size="small">
            <InputLabel>Warehouse</InputLabel>
            <Select
              value={filters.warehouseId}
              onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
              label="Warehouse"
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses.map(wh => (
                <MenuItem key={wh.warehouse_id} value={wh.warehouse_id}>
                  {wh.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            label="Status"
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="shipped">Shipped</MenuItem>
            <MenuItem value="received">Received</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 1 }} />

        {trendData.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>PO Value Trend</Typography>
            <Box sx={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" style={{ fontSize: '10px' }} />
                  <YAxis style={{ fontSize: '10px' }} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}
      </Box>
    </ReportViewer>
  );
};

export default PurchaseOrderReport;
