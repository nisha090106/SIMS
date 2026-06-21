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
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  TablePagination,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/material';
import { ExpandMore, Cancel } from 'lucide-react';

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchMyRequests();
  }, [page, rowsPerPage]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/requests', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
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

  const getStatusTimeline = (request) => {
    const timeline = [{ status: 'Created', date: request.created_at, icon: '📋' }];

    if (request.approved_at) {
      timeline.push({ status: 'Approved', date: request.approved_at, icon: '✓' });
    }

    if (request.rejected_at) {
      timeline.push({ status: 'Rejected', date: request.rejected_at, icon: '✗' });
    }

    if (request.fulfilled_at) {
      timeline.push({ status: 'Fulfilled', date: request.fulfilled_at, icon: '📦' });
    }

    return timeline;
  };

  const handleCancelRequest = async () => {
    try {
      setCancelling(true);
      await axios.post(`/api/requests/${selectedRequest.id}/cancel`);

      setSuccess('Request cancelled successfully');
      setCancelModal(false);
      fetchMyRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenCancelModal = (request) => {
    if (request.status !== 'pending') {
      setError('Only pending requests can be cancelled');
      return;
    }
    setSelectedRequest(request);
    setCancelModal(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant='h5' sx={{ mb: 3 }}>
            My Requests
          </Typography>

          {error && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity='success' sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

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
                    <TableRow sx={{ bgcolor: '#000000' }}>
                      <TableCell></TableCell>
                      <TableCell>Request #</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align='center'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align='center' sx={{ py: 3 }}>
                          <Typography color='textSecondary'>No requests found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <React.Fragment key={request.id}>
                          {/* Main Row */}
                          <TableRow hover>
                            <TableCell sx={{ width: '50px' }}>
                              <Button
                                size='small'
                                onClick={() =>
                                  setExpandedId(expandedId === request.id ? null : request.id)
                                }
                              >
                                <ExpandMore
                                  size={20}
                                  style={{
                                    transform:
                                      expandedId === request.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s',
                                  }}
                                />
                              </Button>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {request.request_number}
                            </TableCell>
                            <TableCell align='center'>{request.items?.length || 0}</TableCell>
                            <TableCell>
                              <Chip
                                label={request.priority}
                                color={getPriorityColor(request.priority)}
                                size='small'
                                variant='outlined'
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={request.status}
                                color={getStatusColor(request.status)}
                                size='small'
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(request.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell align='center'>
                              {request.status === 'pending' && (
                                <Button
                                  size='small'
                                  color='error'
                                  startIcon={<Cancel size={16} />}
                                  onClick={() => handleOpenCancelModal(request)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Expanded Row */}
                          <TableRow>
                            <TableCell colSpan={7} sx={{ py: 0 }}>
                              <Collapse in={expandedId === request.id} timeout='auto' unmountOnExit>
                                <Box sx={{ p: 2, bgcolor: '#000000' }}>
                                  {/* Items Table */}
                                  <Typography variant='subtitle2' sx={{ mb: 1 }}>
                                    Items:
                                  </Typography>
                                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                                    <Table size='small'>
                                      <TableHead>
                                        <TableRow sx={{ bgcolor: '#000000' }}>
                                          <TableCell>SKU</TableCell>
                                          <TableCell>Product</TableCell>
                                          <TableCell align='right'>Requested</TableCell>
                                          <TableCell align='right'>Approved</TableCell>
                                          <TableCell align='right'>Fulfilled</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {request.items?.map((item) => (
                                          <TableRow key={item.id}>
                                            <TableCell>{item.product?.sku}</TableCell>
                                            <TableCell>{item.product?.name}</TableCell>
                                            <TableCell align='right'>
                                              {item.requested_qty}
                                            </TableCell>
                                            <TableCell align='right'>
                                              {item.approved_qty || '-'}
                                            </TableCell>
                                            <TableCell align='right'>
                                              {item.fulfilled_qty || '-'}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>

                                  {/* Timeline */}
                                  <Typography variant='subtitle2' sx={{ mb: 1 }}>
                                    Request Timeline:
                                  </Typography>
                                  <Timeline position='alternate'>
                                    {getStatusTimeline(request).map((event, idx) => (
                                      <TimelineItem key={idx}>
                                        <TimelineOppositeContent color='textSecondary'>
                                          {new Date(event.date).toLocaleString()}
                                        </TimelineOppositeContent>
                                        <TimelineSeparator>
                                          <TimelineDot
                                            color={
                                              event.status === 'Rejected' ? 'error' : 'primary'
                                            }
                                          >
                                            {event.icon}
                                          </TimelineDot>
                                          {idx < getStatusTimeline(request).length - 1 && (
                                            <TimelineConnector />
                                          )}
                                        </TimelineSeparator>
                                        <TimelineContent>
                                          <Typography variant='h6'>{event.status}</Typography>
                                        </TimelineContent>
                                      </TimelineItem>
                                    ))}
                                  </Timeline>

                                  {/* Notes */}
                                  {request.notes && (
                                    <Box
                                      sx={{
                                        mt: 2,
                                        p: 1,
                                        bgcolor: '#fff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 1,
                                      }}
                                    >
                                      <Typography variant='subtitle2'>Notes:</Typography>
                                      <Typography variant='body2'>{request.notes}</Typography>
                                    </Box>
                                  )}

                                  {request.rejection_reason && (
                                    <Alert severity='error' sx={{ mt: 2 }}>
                                      <Typography variant='subtitle2'>Rejection Reason:</Typography>
                                      <Typography variant='body2'>
                                        {request.rejection_reason}
                                      </Typography>
                                    </Alert>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component='div'
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

      {/* Cancel Modal */}
      <Dialog open={cancelModal} onClose={() => setCancelModal(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Cancel Request: {selectedRequest?.request_number}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity='warning'>
            Are you sure you want to cancel this request? This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelModal(false)}>No, Keep It</Button>
          <Button
            onClick={handleCancelRequest}
            variant='contained'
            color='error'
            disabled={cancelling}
          >
            {cancelling ? <CircularProgress size={20} /> : 'Yes, Cancel Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyRequests;
