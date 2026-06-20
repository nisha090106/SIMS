import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Rating,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import { ArrowLeft, User, Mail, Phone, MapPin, Globe, CreditCard, Clock, Save } from 'lucide-react';
import api from '../../services/api';
import SupplierForm from './SupplierForm';

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  // State
  const [supplier, setSupplier] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);

  const handleEditSubmit = async (values) => {
    await api.put(`/suppliers/${id}`, values);
    fetchSupplierDetails();
  };

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  useEffect(() => {
    fetchSupplierDetails();
    fetchSupplierOrders();
  }, [id]);

  const fetchSupplierDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data.data);
      setNotes(res.data.data.notes || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await api.get('/purchase-orders', { params: { supplier_id: id, limit: 500 } });
      setPurchaseOrders(res.data.data?.orders || []);
    } catch (err) {
      console.error('Failed to load supplier orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleUpdateRating = async (newRating) => {
    if (!isManagerOrAdmin) return;
    try {
      await api.patch(`/suppliers/${id}/rating`, { rating: newRating });
      setSupplier({ ...supplier, rating: newRating });
    } catch (err) {
      console.error('Failed to update rating', err);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setNotesSaving(true);
      await api.put(`/suppliers/${id}`, { notes });
      setSupplier({ ...supplier, notes });
      alert('Notes updated successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'blacklisted':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPOStatusChipColor = (status) => {
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

  const formatPaymentTerms = (term) => {
    if (!term) return '-';
    if (term.toLowerCase() === 'cod') return 'COD';
    return term.replace('net', 'Net ');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !supplier) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Supplier not found'}</Alert>
        <Button startIcon={<ArrowLeft size={16} />} onClick={() => navigate('/suppliers')} sx={{ mt: 2 }}>
          Back to Suppliers
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={() => navigate('/suppliers')}
        sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}
      >
        Back to Suppliers
      </Button>

      {/* Supplier Profile Header Card */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1.5, color: '#000000' }}>
              {supplier.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<User size={14} />}
                label={supplier.contact_person || 'No contact person'}
                size="small"
                variant="outlined"
              />
              <Rating
                value={supplier.rating ? Math.round(supplier.rating) : 0}
                onChange={(event, newValue) => handleUpdateRating(newValue)}
                readOnly={!isManagerOrAdmin}
                sx={{ cursor: isManagerOrAdmin ? 'pointer' : 'default' }}
              />
              <Chip
                label={supplier.status?.toUpperCase()}
                color={getStatusChipColor(supplier.status)}
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          </Box>
          {isManagerOrAdmin && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setEditOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Edit Supplier
            </Button>
          )}
        </Box>
      </Paper>

      {/* Info Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Contact Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Mail size={16} style={{ color: '#000000' }} />
                  <Typography variant="body2">{supplier.email || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Phone size={16} style={{ color: '#000000' }} />
                  <Typography variant="body2">{supplier.phone || '-'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Address & Origin
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <MapPin size={16} style={{ color: '#000000' }} />
                  <Typography variant="body2">{supplier.address || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Globe size={16} style={{ color: '#000000' }} />
                  <Typography variant="body2">{supplier.country || '-'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Terms & Logistics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CreditCard size={16} style={{ color: '#000000' }} />
                  <Typography variant="body2">Payment: {formatPaymentTerms(supplier.payment_terms)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Clock size={16} style={{ color: '#000000' }} />
                  <Typography variant="body2">Lead Time: {supplier.lead_time ? `${supplier.lead_time} days` : '-'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Section */}
      <Paper sx={{ borderRadius: 2, boxShadow: 1, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#000000' }}>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} aria-label="supplier tabs">
            <Tab label="Overview" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab label={`Purchase Orders (${purchaseOrders.length})`} sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab label="Notes" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Overview Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary">Supplier Rating</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                    {supplier.rating ? `${parseFloat(supplier.rating).toFixed(1)} / 5.0` : 'No rating'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary">Total Orders Placed</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 0.5 }}>{supplier.total_orders || 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary">Created At</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : '-'}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>System Notes:</Typography>
              <Typography variant="body2" sx={{ fontStyle: supplier.notes ? 'normal' : 'italic', color: supplier.notes ? 'text.primary' : 'text.secondary' }}>
                {supplier.notes || 'No notes available for this supplier.'}
              </Typography>
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Purchase Order History</Typography>
              {ordersLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
              ) : purchaseOrders.length === 0 ? (
                <Typography color="textSecondary">No purchase orders found for this supplier.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#000000' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Order Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Expected Delivery</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Value</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchaseOrders.map((po) => (
                        <TableRow key={po.po_id} hover>
                          <TableCell
                            sx={{
                              fontWeight: 'bold',
                              color: 'primary.main',
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                            onClick={() => navigate(`/purchase-orders/${po.po_id}`)}
                          >
                            {po.po_number}
                          </TableCell>
                          <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                          <TableCell>{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : '-'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>${po.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <Chip
                              label={po.status?.toUpperCase()}
                              color={getPOStatusChipColor(po.status)}
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Supplier Notes</Typography>
              <Typography color="textSecondary" variant="body2" sx={{ mb: 2 }}>
                Record custom notes, audit comments, or special delivery terms for this supplier.
              </Typography>
              <TextField
                multiline
                rows={6}
                fullWidth
                variant="outlined"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write custom notes here..."
                disabled={!isManagerOrAdmin}
                sx={{ mb: 2 }}
              />
              {isManagerOrAdmin && (
                <Button
                  variant="contained"
                  startIcon={<Save size={16} />}
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  sx={{ textTransform: 'none' }}
                >
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      <SupplierForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        supplier={supplier}
        onSubmit={handleEditSubmit}
        onRatingUpdate={(sid, r) => setSupplier((prev) => ({ ...prev, rating: r }))}
      />
    </Box>
  );
};

export default SupplierDetail;
