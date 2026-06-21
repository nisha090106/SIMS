import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Drawer,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
} from '@mui/material';
import { ShoppingCart, Plus, Minus, Trash2, Send } from 'lucide-react';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [requestModal, setRequestModal] = useState(false);
  const [warehouse_id, setWarehouseId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchWarehouses();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products');
      setProducts(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products/categories');
      setCategories(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/warehouses');
      setWarehouses(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch warehouses');
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query),
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const handleAddToCart = (product) => {
    const existing = cart.find((item) => item.product_id === product.product_id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.product_id
            ? { ...item, requested_qty: item.requested_qty + 1 }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.product_id,
          product,
          requested_qty: 1,
        },
      ]);
    }
  };

  const handleUpdateCart = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.product_id === productId ? { ...item, requested_qty: quantity } : item,
        ),
      );
    }
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const handleSubmitRequest = async () => {
    if (!warehouse_id) {
      setError('Please select a destination warehouse');
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      setSubmitting(true);
      const items = cart.map((item) => ({
        product_id: item.product_id,
        requested_qty: item.requested_qty,
      }));

      const response = await axios.post('/api/requests', {
        warehouse_id: parseInt(warehouse_id),
        priority,
        notes: notes || null,
        items,
      });

      setSuccess(`Request ${response.data.data.request_number} created successfully`);
      setCart([]);
      setRequestModal(false);
      setWarehouseId('');
      setPriority('medium');
      setNotes('');

      setTimeout(() => {
        window.location.href = '/requester/my-requests';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.requested_qty, 0);

  return (
    <Box sx={{ p: 3 }}>
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

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant='h5'>Product Catalog</Typography>
        <Button
          variant='contained'
          startIcon={<ShoppingCart size={20} />}
          onClick={() => setCartOpen(true)}
          disabled={cart.length === 0}
        >
          Cart ({cartTotal})
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label='Search by Name or SKU'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              size='small'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size='small'>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label='Category'
              >
                <MenuItem value=''>All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredProducts.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.product_id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {product.image_url && (
                  <CardMedia
                    component='img'
                    height='200'
                    image={product.image_url}
                    alt={product.name}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant='h6' gutterBottom>
                    {product.name}
                  </Typography>
                  <Typography color='textSecondary' variant='body2' gutterBottom>
                    SKU: {product.sku}
                  </Typography>
                  <Typography color='textSecondary' variant='body2' gutterBottom>
                    Category: {product.category}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      label={product.is_active ? 'Available' : 'Unavailable'}
                      color={product.is_active ? 'success' : 'error'}
                      size='small'
                    />
                  </Box>
                </CardContent>
                <Button
                  fullWidth
                  variant='contained'
                  startIcon={<Plus size={18} />}
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.is_active}
                >
                  Add to Cart
                </Button>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {filteredProducts.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography color='textSecondary'>No products found</Typography>
        </Box>
      )}

      {/* Cart Drawer */}
      <Drawer anchor='right' open={cartOpen} onClose={() => setCartOpen(false)}>
        <Box sx={{ width: 400, p: 2 }}>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Shopping Cart
          </Typography>

          {cart.length === 0 ? (
            <Typography color='textSecondary'>Cart is empty</Typography>
          ) : (
            <>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align='center'>Qty</TableCell>
                    <TableCell align='center'>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <Typography variant='body2'>{item.product.sku}</Typography>
                        <Typography variant='caption' color='textSecondary'>
                          {item.product.name}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                          }}
                        >
                          <IconButton
                            size='small'
                            onClick={() =>
                              handleUpdateCart(item.product_id, item.requested_qty - 1)
                            }
                          >
                            <Minus size={14} />
                          </IconButton>
                          <Typography variant='body2'>{item.requested_qty}</Typography>
                          <IconButton
                            size='small'
                            onClick={() =>
                              handleUpdateCart(item.product_id, item.requested_qty + 1)
                            }
                          >
                            <Plus size={14} />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align='center'>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleRemoveFromCart(item.product_id)}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />
              <Typography sx={{ mb: 2 }}>
                <strong>Total Items: {cartTotal}</strong>
              </Typography>
              <Button
                variant='contained'
                fullWidth
                startIcon={<Send size={18} />}
                onClick={() => {
                  setCartOpen(false);
                  setRequestModal(true);
                }}
              >
                Create Request
              </Button>
            </>
          )}
        </Box>
      </Drawer>

      {/* Request Modal */}
      <Dialog open={requestModal} onClose={() => setRequestModal(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Create Request</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Destination Warehouse</InputLabel>
            <Select
              value={warehouse_id}
              onChange={(e) => setWarehouseId(e.target.value)}
              label='Destination Warehouse'
            >
              <MenuItem value=''>Select Warehouse</MenuItem>
              {warehouses.map((wh) => (
                <MenuItem key={wh.warehouse_id} value={wh.warehouse_id}>
                  {wh.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} label='Priority'>
              <MenuItem value='low'>Low</MenuItem>
              <MenuItem value='medium'>Medium</MenuItem>
              <MenuItem value='high'>High</MenuItem>
              <MenuItem value='urgent'>Urgent</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label='Notes'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder='Add any notes for this request...'
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant='subtitle2'>Items in Request:</Typography>
          {cart.map((item) => (
            <Typography key={item.product_id} variant='body2'>
              {item.product.sku} × {item.requested_qty}
            </Typography>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestModal(false)}>Cancel</Button>
          <Button onClick={handleSubmitRequest} variant='contained' disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductCatalog;
