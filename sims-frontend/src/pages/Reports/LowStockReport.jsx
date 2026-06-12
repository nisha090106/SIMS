import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
} from '@mui/material';
import ReportViewer from './ReportViewer';
import api from '../../services/api';

const LowStockReport = () => {
  const [filters, setFilters] = useState({
    warehouseId: '',
    threshold: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [warehouses, setWarehouses] = useState([]);

  const userRole = localStorage.getItem('userRole') || 'staff';

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

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
      const response = await api.get('/reports/low-stock', { params: filters });
      setData(response.data.data.items || []);
      
      const apiSummary = response.data.data.summary || {};
      setSummary({
        totalLowStockItems: apiSummary.totalLowStock || 0,
        averageQuantity: Math.round(apiSummary.avgQuantity || 0),
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/reports/export/low-stock`, {
        params: { format, ...filters },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `low-stock-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export report');
    }
  };

  const columns = [
    { field: 'sku', label: 'SKU' },
    { field: 'name', label: 'Product Name' },
    { field: 'warehouse', label: 'Warehouse' },
    {
      field: 'currentQty',
      label: 'Current Qty',
      align: 'right',
      render: (v) => (
        <Chip
          label={v}
          color={v === 0 ? 'error' : 'warning'}
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    { field: 'reorderLevel', label: 'Reorder Level', align: 'right' },
    { field: 'reorderQty', label: 'Reorder Qty', align: 'right' },
    {
      field: 'variance',
      label: 'Variance',
      align: 'right',
      render: (v) => (
        <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
          {v}
        </span>
      ),
    },
  ];

  return (
    <ReportViewer
      title="Low Stock Alert Report"
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

        <TextField
          label="Custom Threshold Level"
          type="number"
          value={filters.threshold}
          onChange={(e) => setFilters({ ...filters, threshold: e.target.value })}
          placeholder="e.g. 15 (Optional)"
          fullWidth
          size="small"
        />
      </Box>
    </ReportViewer>
  );
};

export default LowStockReport;
