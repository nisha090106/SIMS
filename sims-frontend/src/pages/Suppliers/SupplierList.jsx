import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  IconButton,
  Rating,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Pagination,
  Collapse,
  Tooltip,
} from '@mui/material';
import { Edit2, Eye, Trash2, Plus, ChevronDown, Phone, Clock, Star } from 'lucide-react';
import api from '../../services/api';
import SupplierForm from './SupplierForm';

const SupplierList = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  // State
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(false); // true means rating >= 3

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState({});

  // Form Drawer
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Delete Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        rating: ratingFilter ? 3 : undefined,
      };

      const res = await api.get('/suppliers', { params });
      setSuppliers(res.data.data.suppliers || []);
      setTotalPages(res.data.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, ratingFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchSuppliers]);

  const handleFormSubmit = async (values) => {
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.supplier_id}`, values);
      } else {
        await api.post('/suppliers', values);
      }
      fetchSuppliers();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.error || 'Failed to save supplier');
    }
  };

  const handleRatingUpdate = async (supplierId, newRating) => {
    try {
      await api.patch(`/suppliers/${supplierId}/rating`, { rating: newRating });
      fetchSuppliers();
    } catch (err) {
      console.error('Rating update error:', err);
      setError(err.response?.data?.error || 'Failed to update rating');
    }
  };

  const handleOpenAddForm = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const handleOpenEditForm = (supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleOpenDeleteConfirm = (supplier) => {
    setSupplierToDelete(supplier);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setSupplierToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await api.delete(`/suppliers/${supplierToDelete.supplier_id}`);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete supplier');
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  const toggleRowExpand = (supplierId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [supplierId]: !prev[supplierId],
    }));
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

  const formatPaymentTerms = (term) => {
    if (!term) return '-';
    if (term.toLowerCase() === 'cod') return 'COD';
    return term.replace('net', 'Net ');
  };

  // Visible columns: Name, Contact Person, Email, Payment Terms, Status, Actions
  // Expanded row shows: Phone, Lead Time, Rating
  return (
    <Box sx={{ p: 3 }}>
      {/* Title & Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant='h4' sx={{ fontWeight: 'bold', color: '#000000' }}>
          Suppliers
        </Typography>
        {isManagerOrAdmin && (
          <Button
            variant='contained'
            color='primary'
            startIcon={<Plus size={18} />}
            onClick={handleOpenAddForm}
            sx={{ textTransform: 'none' }}
          >
            Add Supplier
          </Button>
        )}
      </Box>

      {/* Filters Area */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          gap: 2.5,
          alignItems: 'center',
          flexWrap: 'wrap',
          borderRadius: 2,
        }}
      >
        <TextField
          label='Search Suppliers'
          size='small'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder='Name, email, contact, country...'
          sx={{ minWidth: 280 }}
        />

        <FormControl size='small' sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            label='Status'
          >
            <MenuItem value='all'>All Statuses</MenuItem>
            <MenuItem value='active'>Active</MenuItem>
            <MenuItem value='inactive'>Inactive</MenuItem>
            <MenuItem value='blacklisted'>Blacklisted</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              checked={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.checked);
                setPage(1);
              }}
              color='primary'
            />
          }
          label='≥ 3 Stars Rating'
        />
      </Paper>

      {/* Error Message */}
      {error && (
        <Paper
          sx={{ p: 2, mb: 2, bgcolor: '#000000', border: '1px solid #ffcdd2', borderRadius: 2 }}
        >
          <Typography color='error' variant='body2'>
            {error}
          </Typography>
        </Paper>
      )}

      {/* Table Section */}
      {loading && suppliers.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            boxShadow: 1,
            overflowX: 'auto', // horizontal scroll on small screens
          }}
        >
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#000000' }}>
                <TableCell sx={{ fontWeight: 'bold', width: 48 }} /> {/* expand toggle */}
                <TableCell sx={{ fontWeight: 'bold' }}>Company Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Contact Person</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Payment Terms</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                    <Typography color='textSecondary'>No suppliers found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <React.Fragment key={supplier.supplier_id}>
                    {/* Main Row */}
                    <TableRow
                      hover
                      sx={{
                        '& > *': {
                          borderBottom: expandedRows[supplier.supplier_id] ? 'none' : undefined,
                        },
                      }}
                    >
                      <TableCell sx={{ pr: 0, width: 48 }}>
                        <IconButton
                          size='small'
                          onClick={() => toggleRowExpand(supplier.supplier_id)}
                          sx={{
                            transition: 'transform 0.2s',
                            transform: expandedRows[supplier.supplier_id]
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                          }}
                        >
                          <ChevronDown size={16} />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography
                          onClick={() => navigate(`/suppliers/${supplier.supplier_id}`)}
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {supplier.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{supplier.contact_person || '-'}</TableCell>
                      <TableCell>{supplier.email || '-'}</TableCell>
                      <TableCell>{formatPaymentTerms(supplier.payment_terms)}</TableCell>
                      <TableCell>
                        <Chip
                          label={supplier.status?.toUpperCase()}
                          color={getStatusChipColor(supplier.status)}
                          size='small'
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title='View Detail'>
                            <IconButton
                              size='small'
                              color='primary'
                              onClick={() => navigate(`/suppliers/${supplier.supplier_id}`)}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          {isManagerOrAdmin && (
                            <Tooltip title='Edit Supplier'>
                              <IconButton
                                size='small'
                                color='warning'
                                onClick={() => handleOpenEditForm(supplier)}
                              >
                                <Edit2 size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {isAdmin && (
                            <Tooltip title='Delete Supplier'>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleOpenDeleteConfirm(supplier)}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Detail Row */}
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{
                          py: 0,
                          borderBottom: expandedRows[supplier.supplier_id] ? undefined : 'none',
                        }}
                      >
                        <Collapse
                          in={expandedRows[supplier.supplier_id]}
                          timeout='auto'
                          unmountOnExit
                        >
                          <Box
                            sx={{
                              py: 2,
                              px: 2,
                              display: 'flex',
                              gap: 4,
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              bgcolor: '#000000',
                              borderRadius: 1,
                              my: 1,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Phone size={15} style={{ color: '#000000' }} />
                              <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ fontWeight: 600 }}
                              >
                                Phone:
                              </Typography>
                              <Typography variant='body2'>{supplier.phone || '-'}</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Clock size={15} style={{ color: '#000000' }} />
                              <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ fontWeight: 600 }}
                              >
                                Lead Time:
                              </Typography>
                              <Typography variant='body2'>
                                {supplier.lead_time ? `${supplier.lead_time} days` : '-'}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Star size={15} style={{ color: '#000000' }} />
                              <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ fontWeight: 600 }}
                              >
                                Rating:
                              </Typography>
                              <Rating
                                value={supplier.rating ? Math.round(supplier.rating) : 0}
                                readOnly
                                size='small'
                              />
                              <Typography variant='caption' color='text.secondary'>
                                ({supplier.rating ? parseFloat(supplier.rating).toFixed(1) : '0.0'})
                              </Typography>
                            </Box>
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
      )}

      {/* Pagination Area */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, val) => setPage(val)}
            color='primary'
          />
        </Box>
      )}

      {/* Add/Edit Drawer */}
      <SupplierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        supplier={editingSupplier}
        onSubmit={handleFormSubmit}
        onRatingUpdate={handleRatingUpdate}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Delete Supplier?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{supplierToDelete?.name}</strong>? This will
            perform a soft delete.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleCloseDeleteConfirm}
            variant='outlined'
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant='contained'
            color='error'
            sx={{ textTransform: 'none' }}
          >
            Delete Supplier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupplierList;
