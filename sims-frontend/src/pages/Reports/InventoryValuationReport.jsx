import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Typography,
  Divider,
  PieChart as PieChartIcon,
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import ReportViewer from './ReportViewer';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
];

const InventoryValuationReport = () => {
  const [filters, setFilters] = useState({
    warehouseId: '',
    categoryId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categoryValues, setCategoryValues] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchCategories();
    fetchReport();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/warehouses');
      setWarehouses(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch warehouses');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products');
      const uniqueCategories = [...new Set(response.data.data.map((p) => p.category))];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/reports/inventory-valuation', { params: filters });
      setData(response.data.data.items || []);
      setSummary(response.data.data.summary);
      setCategoryValues(
        Object.entries(response.data.data.categoryValues).map(([category, value]) => ({
          name: category,
          value: Math.round(value),
        })),
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`/api/reports/export/inventory`, {
        params: { format },
        responseType: format === 'csv' ? 'text' : 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `inventory-valuation-${new Date().toISOString().split('T')[0]}.${format}`,
      );
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
    { field: 'category', label: 'Category' },
    { field: 'quantity', label: 'Quantity', align: 'right' },
    { field: 'unitCost', label: 'Unit Cost', align: 'right', render: (v) => `$${v.toFixed(2)}` },
    {
      field: 'totalValue',
      label: 'Total Value',
      align: 'right',
      render: (v) => `$${v.toFixed(2)}`,
    },
    { field: 'warehouse', label: 'Warehouse' },
  ];

  return (
    <ReportViewer
      title='Inventory Valuation Report'
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
        <FormControl fullWidth size='small'>
          <InputLabel>Warehouse</InputLabel>
          <Select
            value={filters.warehouseId}
            onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
            label='Warehouse'
          >
            <MenuItem value=''>All Warehouses</MenuItem>
            {warehouses.map((wh) => (
              <MenuItem key={wh.warehouse_id} value={wh.warehouse_id}>
                {wh.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size='small'>
          <InputLabel>Category</InputLabel>
          <Select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            label='Category'
          >
            <MenuItem value=''>All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Category Pie Chart */}
        {categoryValues.length > 0 && (
          <Box>
            <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 'bold' }}>
              Value by Category
            </Typography>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={categoryValues}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${value}`}
                  outerRadius={80}
                  fill='#8884d8'
                  dataKey='value'
                >
                  {categoryValues.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>
    </ReportViewer>
  );
};

export default InventoryValuationReport;
