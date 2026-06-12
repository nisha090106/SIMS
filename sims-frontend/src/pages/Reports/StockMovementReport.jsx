import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Autocomplete,
} from '@mui/material';
import ReportViewer from './ReportViewer';
import api from '../../services/api';

const StockMovementReport = () => {
  const [filters, setFilters] = useState({
    productId: '',
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch products');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/reports/stock-movement', { params: filters });
      setData(response.data.data.items || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/reports/export/stock-movement`, {
        params: { format, ...filters },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock-movements-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export report');
    }
  };

  // Local filtering by type if selected in UI
  const filteredData = data.filter(item => {
    if (actionFilter === 'ALL') return true;
    return item.type.toLowerCase() === actionFilter.toLowerCase();
  });

  const getActionChipColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'in':
        return 'success';
      case 'out':
        return 'error';
      case 'adjust':
        return 'warning';
      case 'transfer':
        return 'info';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      field: 'timestamp',
      label: 'Date & Time',
      render: (v) => new Date(v).toLocaleString(),
    },
    { field: 'productName', label: 'Product' },
    { field: 'sku', label: 'SKU' },
    {
      field: 'type',
      label: 'Type',
      render: (v) => (
        <Chip
          label={v?.toUpperCase()}
          color={getActionChipColor(v)}
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    {
      field: 'quantity',
      label: 'Quantity',
      align: 'right',
      render: (v) => (v > 0 ? `+${v}` : v),
    },
    { field: 'reference', label: 'Reference / Details' },
    { field: 'user', label: 'User' },
  ];

  return (
    <ReportViewer
      title="Stock Movement Report"
      filters={filters}
      onFiltersChange={setFilters}
      loading={loading}
      error={error}
      data={filteredData}
      columns={columns}
      onExport={handleExport}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Autocomplete
          options={products}
          getOptionLabel={(option) => `${option.name} (${option.sku})`}
          value={selectedProduct}
          onChange={(event, newValue) => {
            setSelectedProduct(newValue);
            setFilters({
              ...filters,
              productId: newValue ? newValue.product_id : '',
            });
          }}
          renderInput={(params) => (
            <TextField {...params} label="Search Product" size="small" />
          )}
          fullWidth
        />

        <FormControl fullWidth size="small">
          <InputLabel>Action Type</InputLabel>
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            label="Action Type"
          >
            <MenuItem value="ALL">All Actions</MenuItem>
            <MenuItem value="IN">Stock In</MenuItem>
            <MenuItem value="OUT">Stock Out</MenuItem>
            <MenuItem value="ADJUST">Stock Adjust</MenuItem>
            <MenuItem value="TRANSFER">Stock Transfer</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </ReportViewer>
  );
};

export default StockMovementReport;
