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
} from '@mui/material';
import { Edit2, Eye, Trash2, Plus } from 'lucide-react';
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Title & Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
          Suppliers
        </Typography>
        {isManagerOrAdmin && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} />}
            onClick={handleOpenAddForm}
            sx={{ textTransform: 'none' }}
          >
            Add Supplier
          </Button>
        )}
      </Box>

      {/* Filters Area */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap', borderRadius: 2 }}>
        <TextField
          label="Search Suppliers"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Name, email, contact, country..."
          sx={{ minWidth: 280 }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            label="Status"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="blacklisted">Blacklisted</MenuItem>
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
              color="primary"
            />
          }
          label="≥ 3 Stars Rating"
        />
      </Paper>

      {/* Table Section */}
      {loading && suppliers.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Company Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Contact Person</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Country</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Rating</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Payment Terms</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Lead Time</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography color="textSecondary">No suppliers found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.supplier_id} hover>
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
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>{supplier.country || '-'}</TableCell>
                    <TableCell>
                      <Rating value={supplier.rating ? Math.round(supplier.rating) : 0} readOnly size="small" />
                    </TableCell>
                    <TableCell>{formatPaymentTerms(supplier.payment_terms)}</TableCell>
                    <TableCell>{supplier.lead_time ? `${supplier.lead_time} days` : '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={supplier.status?.toUpperCase()}
                        color={getStatusChipColor(supplier.status)}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/suppliers/${supplier.supplier_id}`)}
                          title="View Detail"
                        >
                          <Eye size={16} />
                        </IconButton>
                        {isManagerOrAdmin && (
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleOpenEditForm(supplier)}
                            title="Edit Supplier"
                          >
                            <Edit2 size={16} />
                          </IconButton>
                        )}
                        {isAdmin && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDeleteConfirm(supplier)}
                            title="Delete Supplier"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
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
            color="primary"
          />
        </Box>
      )}

      {/* Add/Edit Drawer */}
      <SupplierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        supplier={editingSupplier}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Delete Supplier?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{supplierToDelete?.name}</strong>? This will perform a soft delete.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseDeleteConfirm} variant="outlined" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ textTransform: 'none' }}>
            Delete Supplier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupplierList;
