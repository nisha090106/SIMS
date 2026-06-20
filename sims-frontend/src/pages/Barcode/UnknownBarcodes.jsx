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
  Pagination,
  Chip,
  TableSortLabel,
  TablePagination,
} from '@mui/material';
import { Search, CheckCircle, AlertCircle } from 'lucide-react';

const UnknownBarcodes = () => {
  const [unknownBarcodes, setUnknownBarcodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const userRole = localStorage.getItem('userRole') || 'staff';

  // Fetch unknown barcodes
  useEffect(() => {
    fetchUnknownBarcodes();
  }, [page, rowsPerPage]);

  const fetchUnknownBarcodes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/barcodes/unknown', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });

      setUnknownBarcodes(response.data.data.unknownBarcodes);
      setTotal(response.data.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch unknown barcodes');
    } finally {
      setLoading(false);
    }
  };

  // Search products for assignment
  const handleSearchProduct = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await axios.get('/api/products', {
        params: { search: query, limit: 10 },
      });
      setSearchResults(response.data.data || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  // Open assignment modal
  const handleOpenModal = (barcode) => {
    setSelectedBarcode(barcode);
    setSelectedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    setOpenModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedBarcode(null);
    setSelectedProduct(null);
    setSearchQuery('');
  };

  // Assign unknown barcode to product
  const handleAssign = async () => {
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

    try {
      setAssigning(true);
      const response = await axios.post(
        `/api/barcodes/unknown/${selectedBarcode.id}/assign`,
        { product_id: selectedProduct.product_id }
      );

      setSuccess(
        `Barcode assigned successfully to ${response.data.product.sku}`
      );
      handleCloseModal();
      fetchUnknownBarcodes();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get action badge color
  const getActionColor = (action) => {
    switch (action) {
      case 'stock_in':
        return 'success';
      case 'stock_out':
        return 'warning';
      case 'audit':
        return 'info';
      default:
        return 'default';
    }
  };

  // Check if user can view
  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access this module. Only Admins and Managers can view unknown barcodes.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Unknown Barcodes Management
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

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
                      <TableCell>Barcode</TableCell>
                      <TableCell>Warehouse</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Scanned By</TableCell>
                      <TableCell>Scanned At</TableCell>
                      <TableCell align="center">Resolved</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {unknownBarcodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                          <Typography color="textSecondary">
                            No unknown barcodes found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      unknownBarcodes.map((barcode) => (
                        <TableRow key={barcode.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {barcode.barcode}
                            </Typography>
                          </TableCell>
                          <TableCell>{barcode.warehouse?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip
                              label={barcode.action}
                              color={getActionColor(barcode.action)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{barcode.quantity || 1}</TableCell>
                          <TableCell>
                            {barcode.scanner?.first_name} {barcode.scanner?.last_name}
                          </TableCell>
                          <TableCell>{formatDate(barcode.scanned_at)}</TableCell>
                          <TableCell align="center">
                            {barcode.resolved ? (
                              <CheckCircle size={20} color="green" />
                            ) : (
                              <AlertCircle size={20} color="orange" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {!barcode.resolved && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Search size={16} />}
                                onClick={() => handleOpenModal(barcode)}
                              >
                                Assign
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

      {/* Assignment Modal */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Barcode: <span style={{ fontFamily: 'monospace' }}>{selectedBarcode?.barcode}</span>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Barcode Info */}
            {selectedBarcode && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#000000' }}>
                <Typography variant="body2" color="textSecondary">
                  Action: <Chip label={selectedBarcode.action} size="small" color={getActionColor(selectedBarcode.action)} variant="outlined" />
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Qty: {selectedBarcode.quantity || 1}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Warehouse: {selectedBarcode.warehouse?.name}
                </Typography>
              </Paper>
            )}

            {/* Product Search */}
            <TextField
              label="Search Product (Name or SKU)"
              value={searchQuery}
              onChange={(e) => handleSearchProduct(e.target.value)}
              fullWidth
              placeholder="Type to search..."
              sx={{ mb: 2 }}
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Paper sx={{ mb: 2, maxHeight: '300px', overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#000000' }}>
                      <TableCell>SKU</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell align="center">Select</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults.map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant={selectedProduct?.product_id === product.product_id ? 'contained' : 'outlined'}
                            onClick={() => setSelectedProduct(product)}
                          >
                            {selectedProduct?.product_id === product.product_id ? 'Selected' : 'Select'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Selected Product */}
            {selectedProduct && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <CheckCircle size={20} style={{ marginRight: '8px', display: 'inline' }} />
                Selected: {selectedProduct.sku} - {selectedProduct.name}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button
            onClick={handleAssign}
            variant="contained"
            disabled={!selectedProduct || assigning}
          >
            {assigning ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UnknownBarcodes;
