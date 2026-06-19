import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress, Card, CardContent
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { reportAPI } from '../../services/api';

const SupplierPerformanceReport = () => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(); }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await reportAPI.getSupplierPerformance(filters);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    // Basic CSV export logic
    const header = ['Supplier', 'Total Orders', 'Completed Orders', 'Total Spent', 'Fulfillment Rate (%)', 'Lead Time', 'Rating'];
    const rows = data?.items.map(s => [
      s.name, s.totalOrders, s.completedOrders, s.totalSpent, s.fulfillmentRate.toFixed(2), s.leadTime, s.rating
    ]) || [];
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `supplier-performance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Box className="p-4 space-y-6">
      {/* Filters */}
      <Box className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow">
        <TextField
          label="From" type="date" size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <TextField
          label="To" type="date" size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
        <Button variant="contained" onClick={fetchReport}>Apply Filters</Button>
        <Button variant="outlined" onClick={handleExport} className="ml-auto">Export CSV</Button>
      </Box>

      {loading ? (
        <Box className="flex justify-center p-10"><CircularProgress /></Box>
      ) : data ? (
        <>
          {/* KPIs */}
          <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Suppliers</Typography>
                <Typography variant="h5">{data.summary.totalSuppliers}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Spent</Typography>
                <Typography variant="h5">${data.summary.totalSpent.toFixed(2)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Average Fulfillment</Typography>
                <Typography variant="h5">
                  {data.items.length > 0
                    ? (data.items.reduce((s, i) => s + i.fulfillmentRate, 0) / data.items.length).toFixed(1)
                    : 0}%
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Charts */}
          <Box className="bg-white p-4 rounded-lg shadow" style={{ height: 300 }}>
            <Typography variant="subtitle1" className="mb-2">Supplier Spending</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.items}>
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip formatter={(val) => `$${val}`} />
                <Legend />
                <Bar dataKey="totalSpent" fill="#8884d8" name="Total Spent ($)" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} className="shadow">
            <Table size="small">
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell>Supplier</TableCell>
                  <TableCell align="right">Total Orders</TableCell>
                  <TableCell align="right">Completed Orders</TableCell>
                  <TableCell align="right">Total Spent ($)</TableCell>
                  <TableCell align="right">Fulfillment Rate</TableCell>
                  <TableCell align="right">Lead Time (days)</TableCell>
                  <TableCell align="right">Rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.supplierId} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.totalOrders}</TableCell>
                    <TableCell align="right">{row.completedOrders}</TableCell>
                    <TableCell align="right">{row.totalSpent.toFixed(2)}</TableCell>
                    <TableCell align="right">{row.fulfillmentRate.toFixed(1)}%</TableCell>
                    <TableCell align="right">{row.leadTime || '-'}</TableCell>
                    <TableCell align="right">{row.rating || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : null}
    </Box>
  );
};

export default SupplierPerformanceReport;
