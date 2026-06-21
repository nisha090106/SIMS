import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import ReportViewer from './ReportViewer';
import api from '../../services/api';

const AuditLogReport = () => {
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);

  // Local filter for user selection from log list
  const [selectedUser, setSelectedUser] = useState('ALL');

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/reports/audit-log', { params: filters });
      setData(response.data.data.items || []);

      const apiSummary = response.data.data.summary || {};
      setSummary({
        totalLogs: apiSummary.totalLogs || 0,
        uniqueUsers: apiSummary.uniqueUsers || 0,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/reports/export/audit-log`, {
        params: { format, ...filters },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export audit logs');
    }
  };

  const getUniqueUsers = () => {
    const usersMap = {};
    data.forEach((item) => {
      if (item.user) {
        usersMap[item.user] = true;
      }
    });
    return Object.keys(usersMap).sort();
  };

  const filteredData = data.filter((item) => {
    if (selectedUser === 'ALL') return true;
    return item.user === selectedUser;
  });

  const columns = [
    {
      field: 'timestamp',
      label: 'Timestamp',
      render: (v) => new Date(v).toLocaleString(),
    },
    { field: 'user', label: 'User' },
    { field: 'email', label: 'Email' },
    { field: 'role', label: 'Role', render: (v) => v?.toUpperCase() },
    { field: 'action', label: 'Action', render: (v) => v?.toUpperCase() },
    { field: 'entity', label: 'Entity' },
    {
      field: 'details',
      label: 'Changes/Details',
      render: (v) => (
        <Box
          sx={{
            maxWidth: 300,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
          title={v}
        >
          {v}
        </Box>
      ),
    },
    { field: 'ipAddress', label: 'IP Address' },
  ];

  const uniqueUsers = getUniqueUsers();

  return (
    <ReportViewer
      title='Audit Log Report'
      filters={filters}
      onFiltersChange={setFilters}
      loading={loading}
      error={error}
      data={filteredData}
      summary={summary}
      columns={columns}
      onExport={handleExport}
      disableExportForNonAdmin={true}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth size='small'>
          <InputLabel>Action Type</InputLabel>
          <Select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            label='Action Type'
          >
            <MenuItem value=''>All Actions</MenuItem>
            <MenuItem value='create'>Create</MenuItem>
            <MenuItem value='update'>Update</MenuItem>
            <MenuItem value='delete'>Delete</MenuItem>
            <MenuItem value='login'>Login</MenuItem>
            <MenuItem value='logout'>Logout</MenuItem>
            <MenuItem value='BARCODE_SCAN'>Barcode Scan</MenuItem>
            <MenuItem value='CREATE_PURCHASE_ORDER'>Create PO</MenuItem>
            <MenuItem value='RECEIVE_PURCHASE_ORDER'>Receive PO</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size='small'>
          <InputLabel>User Filter</InputLabel>
          <Select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            label='User Filter'
            disabled={uniqueUsers.length === 0}
          >
            <MenuItem value='ALL'>All Users</MenuItem>
            {uniqueUsers.map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </ReportViewer>
  );
};

export default AuditLogReport;
