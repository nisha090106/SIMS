import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress, Card, CardContent
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { reportAPI } from '../../services/api';

const SalesReport = () => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(); }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await reportAPI.getSalesReport(filters);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const header = ['Order Number', 'Customer', 'Order Date', 'Status', 'Total Amount', 'Warehouse', 'Created By'];
    const rows = data?.items.map(o => [
      o.orderNumber, o.customerName, new Date(o.orderDate).toLocaleDateString(), o.status, o.totalAmount, o.warehouse, o.createdBy
    ]) || [];
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
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
                <Typography color="textSecondary" gutterBottom>Total Orders</Typography>
                <Typography variant="h5">{data.summary.totalOrders}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Revenue</Typography>
                <Typography variant="h5">${data.summary.totalRevenue.toFixed(2)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Avg Order Value</Typography>
                <Typography variant="h5">
                  ${data.summary.totalOrders > 0 ? (data.summary.totalRevenue / data.summary.totalOrders).toFixed(2) : 0}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Charts */}
          <Box className="bg-white p-4 rounded-lg shadow" style={{ height: 300 }}>
            <Typography variant="subtitle1" className="mb-2">Monthly Sales Revenue</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyAggregation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip formatter={(val) => `$${val}`} />
                <Legend />
                <Line type="monotone" dataKey="totalSales" stroke="#00C49F" name="Revenue ($)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} className="shadow">
            <Table size="small">
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell>Order #</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount ($)</TableCell>
                  <TableCell>Warehouse</TableCell>
                  <TableCell>Created By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.orderNumber} hover>
                    <TableCell>{row.orderNumber}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{new Date(row.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell align="right">{row.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>{row.warehouse}</TableCell>
                    <TableCell>{row.createdBy}</TableCell>
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

export default SalesReport;
