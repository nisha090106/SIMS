import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  TablePagination,
  Grid,
} from '@mui/material';
import { Eye, CheckCircle, XCircle, Truck, Cancel } from 'lucide-react';

const RequestManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [tabValue, setTabValue] = useState(0);

  // Modal states
  const [viewModal, setViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [fulfillModal, setFulfillModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvedQtys, setApprovedQtys] = useState({});
  const [fulfilledQtys, setFulfilledQtys] = useState({});
  const [modalLoading, setModalLoading] = useState(false);

  const userRole = localStorage.getItem('userRole') || 'staff';
  const statuses = ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'];
  const statusLabels = ['All', 'Pending', 'Approved', 'Rejected', 'Fulfilled'];

  useEffect(() => {
    fetchRequests();
  }, [page, rowsPerPage, tabValue]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const statusFilter = tabValue === 0 ? null : statuses[tabValue - 1];
      
      const response = await axios.get('/api/requests', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          status: statusFilter,
        },
      });

      setRequests(response.data.data.requests);
      setTotal(response.data.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'info';
      case 'fulfilled':
        return 'success';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setViewModal(true);
  };

  const handleOpenApproveModal = (request) => {
    setSelectedRequest(request);
    const initialQtys = {};
    request.items.forEach(item => {
      initialQtys[item.id] = item.requested_qty;
    });
    setApprovedQtys(initialQtys);
    setApproveModal(true);
  };

  const handleOpenRejectModal = (request) => {
    setSelectedRequest(request);
    setRejectReason('');
    setRejectModal(true);
  };

  const handleOpenFulfillModal = (request) => {
    setSelectedRequest(request);
    const initialQtys = {};
    request.items.forEach(item => {
      initialQtys[item.id] = item.approved_qty || item.requested_qty;
    });
    setFulfilledQtys(initialQtys);
    setFulfillModal(true);
  };

  const handleApproveRequest = async () => {
    try {
      setModalLoading(true);
      const approved_items = selectedRequest.items.map(item => ({
        id: item.id,
        approved_qty: approvedQtys[item.id],
      }));

      await axios.post(`/api/requests/${selectedRequest.id}/approve`, {
        approved_items,
      });

      setSuccess('Request approved successfully');
      setApproveModal(false);
      fetchRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setModalLoading(true);
      await axios.post(`/api/requests/${selectedRequest.id}/reject`, {
        rejection_reason: rejectReason,
      });

      setSuccess('Request rejected successfully');
      setRejectModal(false);
      fetchRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setModalLoading(false);
    }
  };

  const handleFulfillRequest = async () => {
    try {
      setModalLoading(true);
      const fulfill_items = selectedRequest.items.map(item => ({
        id: item.id,
        fulfilled_qty: fulfilledQtys[item.id],
      }));

      await axios.post(`/api/requests/${selectedRequest.id}/fulfill`, {
        fulfill_items,
      });

      setSuccess('Request fulfilled successfully');
      setFulfillModal(false);
      fetchRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fulfill request');
    } finally {
      setModalLoading(false);
    }
  };

  const canApprove = (request) => (userRole === 'admin' || userRole === 'manager') && request.status === 'pending';
  const canReject = (request) => (userRole === 'admin' || userRole === 'manager') && ['pending', 'approved'].includes(request.status);
  const canFulfill = (request) => ['admin', 'manager', 'staff'].includes(userRole) && request.status === 'approved';

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3 }}>Request Management</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* Tabs */}
          <Tabs value={tabValue} onChange={(e, v) => { setTabValue(v); setPage(0); }} sx={{ mb: 2 }}>
            {statusLabels.map((label, idx) => <Tab key={idx} label={label} />)}
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Table */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>Request #</TableCell>
                      <TableCell>Requester</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell align="center">Items</TableCell>
                      <TableCell>Warehouse</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                          <Typography color="textSecondary">No requests found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.id} hover>
                          <TableCell sx={{ fontWeight: 'bold' }}>{request.request_number}</TableCell>
                          <TableCell>
                            {request.requester?.first_name} {request.requester?.last_name}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={request.priority}
                              color={getPriorityColor(request.priority)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">{request.items?.length || 0}</TableCell>
                          <TableCell>{request.warehouse?.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={request.status}
                              color={getStatusColor(request.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              startIcon={<Eye size={16} />}
                              onClick={() => handleViewRequest(request)}
                            >
                              View
                            </Button>
                            {canApprove(request) && (
                              <Button
                                size="small"
                                color="success"
                                startIcon={<CheckCircle size={16} />}
                                onClick={() => handleOpenApproveModal(request)}
                              >
                                Approve
                              </Button>
                            )}
                            {canReject(request) && (
                              <Button
                                size="small"
                                color="error"
                                startIcon={<XCircle size={16} />}
                                onClick={() => handleOpenRejectModal(request)}
                              >
                                Reject
                              </Button>
                            )}
                            {canFulfill(request) && (
                              <Button
                                size="small"
                                color="info"
                                startIcon={<Truck size={16} />}
                                onClick={() => handleOpenFulfillModal(request)}
                              >
                                Fulfill
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={viewModal} onClose={() => setViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Details: {selectedRequest?.request_number}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedRequest && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary">Requester</Typography>
                  <Typography>{selectedRequest.requester?.first_name} {selectedRequest.requester?.last_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary">Warehouse</Typography>
                  <Typography>{selectedRequest.warehouse?.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary">Priority</Typography>
                  <Chip label={selectedRequest.priority} size="small" color={getPriorityColor(selectedRequest.priority)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary">Status</Typography>
                  <Chip label={selectedRequest.status} size="small" color={getStatusColor(selectedRequest.status)} />
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mb: 1 }}>Items</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>SKU</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Requested</TableCell>
                      <TableCell align="right">Approved</TableCell>
                      <TableCell align="right">Fulfilled</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRequest.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product?.sku}</TableCell>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell align="right">{item.requested_qty}</TableCell>
                        <TableCell align="right">{item.approved_qty || '-'}</TableCell>
                        <TableCell align="right">{item.fulfilled_qty || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedRequest.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography color="textSecondary">Notes</Typography>
                  <Typography>{selectedRequest.notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={approveModal} onClose={() => setApproveModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Request: {selectedRequest?.request_number}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Edit approved quantities:</Typography>
          {selectedRequest?.items?.map((item) => (
            <TextField
              key={item.id}
              label={`${item.product?.sku} - ${item.product?.name}`}
              type="number"
              value={approvedQtys[item.id] || 0}
              onChange={(e) => setApprovedQtys({ ...approvedQtys, [item.id]: parseInt(e.target.value) })}
              inputProps={{ min: 0, max: item.requested_qty }}
              fullWidth
              sx={{ mb: 2 }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveModal(false)}>Cancel</Button>
          <Button onClick={handleApproveRequest} variant="contained" disabled={modalLoading}>
            {modalLoading ? <CircularProgress size={20} /> : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModal} onClose={() => setRejectModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Request: {selectedRequest?.request_number}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            fullWidth
            multiline
            rows={4}
            placeholder="Provide a reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectModal(false)}>Cancel</Button>
          <Button onClick={handleRejectRequest} variant="contained" color="error" disabled={modalLoading}>
            {modalLoading ? <CircularProgress size={20} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fulfill Modal */}
      <Dialog open={fulfillModal} onClose={() => setFulfillModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Fulfill Request: {selectedRequest?.request_number}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Set fulfilled quantities:</Typography>
          {selectedRequest?.items?.map((item) => (
            <TextField
              key={item.id}
              label={`${item.product?.sku} - Approved: ${item.approved_qty || item.requested_qty}`}
              type="number"
              value={fulfilledQtys[item.id] || 0}
              onChange={(e) => setFulfilledQtys({ ...fulfilledQtys, [item.id]: parseInt(e.target.value) })}
              inputProps={{ min: 0, max: item.approved_qty || item.requested_qty }}
              fullWidth
              sx={{ mb: 2 }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFulfillModal(false)}>Cancel</Button>
          <Button onClick={handleFulfillRequest} variant="contained" color="success" disabled={modalLoading}>
            {modalLoading ? <CircularProgress size={20} /> : 'Fulfill'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestManagement;
