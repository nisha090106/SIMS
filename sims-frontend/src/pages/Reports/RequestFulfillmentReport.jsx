import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import ReportViewer from './ReportViewer';
import api from '../../services/api';

const RequestFulfillmentReport = () => {
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);

  // Local filter for requester (selected from dropdown filled dynamically)
  const [selectedRequester, setSelectedRequester] = useState('ALL');

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/reports/request-fulfillment', { params: filters });
      setData(response.data.data.items || []);

      const apiSummary = response.data.data.summary || {};
      setSummary({
        totalRequests: apiSummary.totalRequests || 0,
        fulfilledRequests: apiSummary.fulfilled || 0,
        pendingRequests: apiSummary.pending || 0,
        rejectedRequests: apiSummary.rejected || 0,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/reports/export/request-fulfillment`, {
        params: { format, ...filters },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `request-fulfillment-${new Date().toISOString().split('T')[0]}.${format}`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export report');
    }
  };

  // Extract unique requesters from the fetched data
  const getUniqueRequesters = () => {
    const requestersMap = {};
    data.forEach((item) => {
      if (item.requester) {
        requestersMap[item.requester] = true;
      }
    });
    return Object.keys(requestersMap).sort();
  };

  const filteredData = data.filter((item) => {
    if (selectedRequester === 'ALL') return true;
    return item.requester === selectedRequester;
  });

  const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'fulfilled':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'approved':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityChipColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const columns = [
    { field: 'requestNumber', label: 'Request#' },
    { field: 'requester', label: 'Requester' },
    { field: 'itemCount', label: 'Unique Items', align: 'right' },
    { field: 'totalRequested', label: 'Requested Qty', align: 'right' },
    { field: 'totalFulfilled', label: 'Fulfilled Qty', align: 'right' },
    {
      field: 'status',
      label: 'Status',
      render: (v) => (
        <Chip
          label={v?.toUpperCase()}
          color={getStatusChipColor(v)}
          size='small'
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    {
      field: 'priority',
      label: 'Priority',
      render: (v) => (
        <Chip
          label={v?.toUpperCase()}
          color={getPriorityChipColor(v)}
          variant='outlined'
          size='small'
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    {
      field: 'createdAt',
      label: 'Created At',
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      field: 'fulfilledAt',
      label: 'Fulfilled At',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
  ];

  const uniqueRequesters = getUniqueRequesters();

  return (
    <ReportViewer
      title='Request Fulfillment Report'
      filters={filters}
      onFiltersChange={setFilters}
      loading={loading}
      error={error}
      data={filteredData}
      summary={summary}
      columns={columns}
      onExport={handleExport}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth size='small'>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            label='Status'
          >
            <MenuItem value=''>All Statuses</MenuItem>
            <MenuItem value='pending'>Pending</MenuItem>
            <MenuItem value='approved'>Approved</MenuItem>
            <MenuItem value='rejected'>Rejected</MenuItem>
            <MenuItem value='fulfilled'>Fulfilled</MenuItem>
            <MenuItem value='cancelled'>Cancelled</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size='small'>
          <InputLabel>Requester</InputLabel>
          <Select
            value={selectedRequester}
            onChange={(e) => setSelectedRequester(e.target.value)}
            label='Requester'
            disabled={uniqueRequesters.length === 0}
          >
            <MenuItem value='ALL'>All Requesters</MenuItem>
            {uniqueRequesters.map((req) => (
              <MenuItem key={req} value={req}>
                {req}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </ReportViewer>
  );
};

export default RequestFulfillmentReport;
