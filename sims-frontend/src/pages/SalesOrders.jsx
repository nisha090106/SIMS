import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  Drawer,
  Stack,
  Snackbar,
  LinearProgress,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  CheckCircle as FulfillIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ShoppingCart as CartIcon,
  LocalShipping as ShipIcon,
  Done as DoneIcon,
  Warning as WarnIcon,
  ExpandMore as ExpandIcon,
  RestartAlt as ResetIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import { salesOrderAPI, productAPI, warehouseAPI, inventoryAPI } from '../services/api';

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

function parseItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  draft: { label: 'Draft', color: '#000000', bg: '#DBEAFE' },
  pending: { label: 'Pending', color: '#000000', bg: '#FEF3C7' },
  dispatched: { label: 'Dispatched', color: '#000000', bg: '#FEF3C7' },
  delivered: { label: 'Delivered', color: '#000000', bg: '#D1FAE5' },
  cancelled: { label: 'Cancelled', color: '#000000', bg: '#FEE2E2' },
};

function StatusChip({ status }) {
  const cfg = STATUS[status] || { label: status, color: '#000000', bg: '#F1F5F9' };
  return (
    <Chip
      label={cfg.label}
      size='small'
      sx={{
        fontWeight: 700,
        fontSize: 11,
        bgcolor: cfg.bg,
        color: cfg.color,
        border: 'none',
        height: 22,
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}

// ── Status tabs ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending', label: 'Pending' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

// ── Snackbar helper ──────────────────────────────────────────────────────────

function useSnack() {
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const show = (msg, severity = 'success') => setSnack({ open: true, msg, severity });
  const hide = () => setSnack((s) => ({ ...s, open: false }));
  return { snack, show, hide };
}

// ── Create Order Modal (3-step stepper) ─────────────────────────────────────

const STEPS = ['Customer Details', 'Add Items', 'Review & Submit'];

function CreateOrderModal({ open, onClose, onSuccess, warehouses, userRole, userWarehouseIds }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [customerName, setCustomerName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2
  const [products, setProducts] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [items, setItems] = useState([]);
  const [stockMap, setStockMap] = useState({}); // { product_id: available_qty }

  // Load products on search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      try {
        const res = await productAPI.getAll({ search: prodSearch || undefined, limit: 50 });
        setProducts(res.data.data?.products || []);
      } catch {
        /* silent */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [prodSearch, open]);

  // Fetch live stock for selected warehouse + products
  useEffect(() => {
    if (!warehouseId || items.length === 0) {
      setStockMap({});
      return;
    }
    (async () => {
      try {
        const res = await inventoryAPI.getAll({ warehouseId, limit: 500 });
        const inv = res.data.data?.inventory || [];
        const map = {};
        inv.forEach((r) => {
          map[r.product_id] = r.available_qty ?? r.quantity ?? 0;
        });
        setStockMap(map);
      } catch {
        /* silent */
      }
    })();
  }, [warehouseId, items.length]);

  const addProduct = (product) => {
    if (!product) return;
    if (items.find((i) => i.product_id === product.product_id)) return; // already added
    setItems((prev) => [
      ...prev,
      {
        product_id: product.product_id,
        product_name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: Number(product.unit_price || 0),
        total_price: Number(product.unit_price || 0),
      },
    ]);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        return updated;
      }),
    );
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((s, i) => s + (Number(i.total_price) || 0), 0);

  const reset = () => {
    setStep(0);
    setCustomerName('');
    setWarehouseId('');
    setDeliveryDate('');
    setNotes('');
    setItems([]);
    setStockMap({});
    setProdSearch('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canNext0 = customerName.trim() && warehouseId;
  const canNext1 = items.length > 0;

  // Stock warnings
  const stockWarnings = items.filter((item) => {
    const avail = stockMap[item.product_id] ?? null;
    return avail !== null && item.quantity > avail;
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await salesOrderAPI.create({
        customer_name: customerName.trim(),
        warehouse_id: Number(warehouseId),
        delivery_date: deliveryDate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      });
      reset();
      onSuccess('Sales order created successfully');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  // Warehouse options scoped by role
  const allowedWarehouses =
    userRole === 'admin'
      ? warehouses
      : warehouses.filter((w) => userWarehouseIds.includes(w.warehouse_id));

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='md'
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid #E2E8F0' } }}
    >
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CartIcon sx={{ color: '#000000', fontSize: 22 }} />
          <Typography fontWeight={700} fontSize={16}>
            New Sales Order
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size='small'>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pt: 1, pb: 0.5 }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map((s) => (
            <Step key={s}>
              <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 12, fontWeight: 600 } }}>
                {s}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity='error' sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* ── Step 0: Customer Details ── */}
        {step === 0 && (
          <Stack spacing={2}>
            <TextField
              label='Customer Name'
              required
              fullWidth
              size='small'
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder='Enter customer name'
            />
            <TextField
              select
              label='Warehouse'
              required
              fullWidth
              size='small'
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <MenuItem value=''>
                <em>Select warehouse…</em>
              </MenuItem>
              {allowedWarehouses.map((w) => (
                <MenuItem key={w.warehouse_id} value={w.warehouse_id}>
                  {w.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label='Expected Delivery Date'
              type='date'
              fullWidth
              size='small'
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().split('T')[0] }}
            />
            <TextField
              label='Notes'
              multiline
              rows={2}
              fullWidth
              size='small'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Optional notes…'
            />
          </Stack>
        )}

        {/* ── Step 1: Add Items ── */}
        {step === 1 && (
          <Stack spacing={2}>
            {!warehouseId && (
              <Alert severity='warning' sx={{ borderRadius: 2 }}>
                No warehouse selected — stock availability cannot be validated.
              </Alert>
            )}
            <Autocomplete
              options={products}
              getOptionLabel={(p) => `${p.name} (${p.sku})`}
              onChange={(_, product) => {
                addProduct(product);
                setProdSearch('');
              }}
              inputValue={prodSearch}
              onInputChange={(_, v) => setProdSearch(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Search & add product'
                  size='small'
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position='start'>
                        <SearchIcon sx={{ fontSize: 16, color: '#000000' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box
                  component='li'
                  {...props}
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                >
                  <Box>
                    <Typography variant='body2' fontWeight={600}>
                      {option.name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {option.sku}
                    </Typography>
                  </Box>
                  <Typography variant='body2' fontWeight={700} color='primary'>
                    {fmt(option.unit_price)}
                  </Typography>
                </Box>
              )}
              noOptionsText={prodSearch ? 'No products found' : 'Type to search products'}
              filterOptions={(x) => x}
            />

            {items.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <CartIcon sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
                <Typography variant='body2'>
                  No items added yet. Search for products above.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant='outlined' sx={{ borderRadius: 2 }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      {['Product', 'Stock', 'Qty', 'Unit Price', 'Total', ''].map((h) => (
                        <TableCell
                          key={h}
                          sx={{
                            fontWeight: 700,
                            fontSize: 11,
                            color: '#64748B',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            py: 1,
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, idx) => {
                      const avail = stockMap[item.product_id] ?? null;
                      const overStock = avail !== null && item.quantity > avail;
                      return (
                        <TableRow key={idx} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>
                              {item.product_name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ fontFamily: 'monospace' }}
                            >
                              {item.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {avail === null ? (
                              <Typography variant='caption' color='text.disabled'>
                                —
                              </Typography>
                            ) : (
                              <Typography
                                variant='caption'
                                fontWeight={600}
                                color={
                                  avail === 0
                                    ? 'error'
                                    : avail < 10
                                      ? 'warning.main'
                                      : 'success.main'
                                }
                              >
                                {avail} units
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ width: 100 }}>
                            <TextField
                              type='number'
                              size='small'
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  idx,
                                  'quantity',
                                  Math.max(1, parseInt(e.target.value) || 1),
                                )
                              }
                              inputProps={{
                                min: 1,
                                style: { textAlign: 'center', padding: '4px 6px' },
                              }}
                              error={overStock}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell sx={{ width: 130 }}>
                            <TextField
                              type='number'
                              size='small'
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)
                              }
                              inputProps={{ min: 0, step: 0.01, style: { padding: '4px 6px' } }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position='start' sx={{ '& p': { fontSize: 12 } }}>
                                    ₹
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ width: 110 }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>
                            {fmt(item.total_price)}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size='small'
                              onClick={() => removeItem(idx)}
                              sx={{ color: '#000000' }}
                            >
                              <CloseIcon fontSize='small' />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {stockWarnings.length > 0 && (
              <Alert severity='warning' icon={<WarnIcon />} sx={{ borderRadius: 2 }}>
                <strong>{stockWarnings.length} item(s)</strong> exceed available stock. You can
                still create the order as a draft, but fulfillment will fail unless stock is
                replenished.
              </Alert>
            )}

            {items.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Typography variant='subtitle1' fontWeight={800} fontSize={16}>
                  Order Total: {fmt(total)}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <Stack spacing={2}>
            <Paper variant='outlined' sx={{ borderRadius: 2, p: 2 }}>
              <Typography
                variant='subtitle2'
                fontWeight={700}
                sx={{
                  mb: 1.5,
                  color: '#000000',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  letterSpacing: '0.05em',
                }}
              >
                Order Details
              </Typography>
              <Stack spacing={1}>
                {[
                  ['Customer', customerName],
                  [
                    'Warehouse',
                    allowedWarehouses.find((w) => String(w.warehouse_id) === String(warehouseId))
                      ?.name || '—',
                  ],
                  ['Delivery Date', deliveryDate ? fmtDate(deliveryDate) : 'Not specified'],
                  ['Notes', notes || 'None'],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>
                      {label}
                    </Typography>
                    <Typography variant='body2' fontWeight={600}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper variant='outlined' sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#F8FAFC', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
                <Typography
                  variant='subtitle2'
                  fontWeight={700}
                  sx={{
                    color: '#64748B',
                    textTransform: 'uppercase',
                    fontSize: 11,
                    letterSpacing: '0.05em',
                  }}
                >
                  Items ({items.length})
                </Typography>
              </Box>
              {items.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    py: 1.25,
                    borderBottom: idx < items.length - 1 ? '1px solid #F1F5F9' : 'none',
                  }}
                >
                  <Box>
                    <Typography variant='body2' fontWeight={600}>
                      {item.product_name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {item.quantity} × {fmt(item.unit_price)}
                    </Typography>
                  </Box>
                  <Typography variant='body2' fontWeight={700}>
                    {fmt(item.total_price)}
                  </Typography>
                </Box>
              ))}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  px: 2,
                  py: 1.5,
                  borderTop: '2px solid #E2E8F0',
                  bgcolor: '#000000',
                }}
              >
                <Typography fontWeight={800} fontSize={15}>
                  Total: {fmt(total)}
                </Typography>
              </Box>
            </Paper>

            {stockWarnings.length > 0 && (
              <Alert severity='warning' sx={{ borderRadius: 2 }}>
                <strong>Stock warning:</strong>{' '}
                {stockWarnings.map((i) => i.product_name).join(', ')} exceed available stock. Order
                will be created as <strong>draft</strong> — fulfill after restocking.
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E2E8F0', gap: 1 }}>
        <Button onClick={handleClose} variant='outlined' size='small' sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        {step > 0 && (
          <Button
            onClick={() => setStep((s) => s - 1)}
            variant='outlined'
            size='small'
            sx={{ borderRadius: 2 }}
          >
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !canNext0) || (step === 1 && !canNext1)}
            variant='contained'
            size='small'
            sx={{ borderRadius: 2, minWidth: 80 }}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant='contained'
            size='small'
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={14} color='inherit' /> : <AddIcon />}
            sx={{ borderRadius: 2, minWidth: 120 }}
          >
            {submitting ? 'Creating…' : 'Create Order'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Fulfillment Confirmation Dialog ─────────────────────────────────────────

function FulfillDialog({ order, open, onClose, onConfirm, loading }) {
  if (!order) return null;
  const items = parseItems(order.items);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid #E2E8F0' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShipIcon sx={{ color: '#000000' }} />
        <Typography fontWeight={700}>Fulfill Order</Typography>
      </DialogTitle>
      <DialogContent>
        <Alert severity='info' sx={{ mb: 2, borderRadius: 2 }}>
          Fulfilling this order will <strong>deduct stock</strong> from the warehouse for each item
          below. This action cannot be undone.
        </Alert>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
          Order <strong>{order.order_number}</strong> — {order.customer_name}
        </Typography>
        <TableContainer component={Paper} variant='outlined' sx={{ borderRadius: 2 }}>
          <Table size='small'>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                {['Product', 'Qty to Deduct', 'Unit Price', 'Total'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      fontSize: 11,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      py: 0.75,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600}>
                      {item.product_name}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {item.sku}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`−${item.quantity}`}
                      size='small'
                      sx={{ bgcolor: '#FEE2E2', color: '#EF4444', fontWeight: 700, fontSize: 12 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{fmt(item.unit_price)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' fontWeight={700}>
                      {fmt(item.total_price ?? item.quantity * item.unit_price)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
          <Typography fontWeight={800}>Total: {fmt(order.total_amount)}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} variant='outlined' size='small' sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant='contained'
          color='success'
          size='small'
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color='inherit' /> : <FulfillIcon />}
          sx={{ borderRadius: 2 }}
        >
          {loading ? 'Fulfilling…' : 'Confirm Fulfillment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Cancellation Confirmation Dialog ────────────────────────────────────────

function CancelDialog({ order, open, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  if (!order) return null;
  const isDispatched = order.status === 'dispatched';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xs'
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid #E2E8F0' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarnIcon sx={{ color: '#000000' }} />
        <Typography fontWeight={700}>Cancel Order</Typography>
      </DialogTitle>
      <DialogContent>
        {isDispatched && (
          <Alert severity='warning' sx={{ mb: 2, borderRadius: 2 }}>
            This order has already been <strong>dispatched</strong>. Cancelling will{' '}
            <strong>restore stock</strong> to the warehouse.
          </Alert>
        )}
        <Typography variant='body2' sx={{ mb: 2 }}>
          Cancel order <strong>{order.order_number}</strong> for{' '}
          <strong>{order.customer_name}</strong>?
        </Typography>
        <TextField
          label='Reason (optional)'
          fullWidth
          size='small'
          multiline
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder='Enter reason for cancellation…'
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} variant='outlined' size='small' sx={{ borderRadius: 2 }}>
          Keep Order
        </Button>
        <Button
          onClick={() => onConfirm(reason)}
          variant='contained'
          color='error'
          size='small'
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color='inherit' /> : <CancelIcon />}
          sx={{ borderRadius: 2 }}
        >
          {loading ? 'Cancelling…' : 'Cancel Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Order Details Drawer ─────────────────────────────────────────────────────

const TIMELINE_STEPS = ['draft', 'pending', 'dispatched', 'delivered'];

function OrderDrawer({ order, open, onClose, onFulfill, onCancel, onDeliver, userRole }) {
  if (!order) return null;
  const items = parseItems(order.items);
  const isAdmin = userRole === 'admin';
  const isMgr = userRole === 'manager';
  const canFulfill = (isAdmin || isMgr) && ['draft', 'pending'].includes(order.status);
  const canDeliver = (isAdmin || isMgr) && order.status === 'dispatched';
  const canCancel = (isAdmin || isMgr) && !['delivered', 'cancelled'].includes(order.status);

  const statusIdx = TIMELINE_STEPS.indexOf(order.status);

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 480 },
          bgcolor: '#FFFFFF',
          borderLeft: '1px solid #E2E8F0',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <Box>
          <Typography
            fontWeight={700}
            fontSize={15}
            sx={{ fontFamily: 'monospace', color: '#000000' }}
          >
            {order.order_number}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {order.customer_name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusChip status={order.status} />
          <IconButton size='small' onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {/* Status timeline */}
        {order.status !== 'cancelled' && (
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
            <Typography
              variant='caption'
              fontWeight={700}
              sx={{
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#000000',
                display: 'block',
                mb: 1.5,
              }}
            >
              Status Timeline
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {TIMELINE_STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: 64,
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: i <= statusIdx ? '#3B82F6' : '#E2E8F0',
                        color: i <= statusIdx ? '#fff' : '#94A3B8',
                        fontWeight: 700,
                        fontSize: 12,
                        transition: 'all 0.2s',
                      }}
                    >
                      {i < statusIdx ? <DoneIcon sx={{ fontSize: 14 }} /> : i + 1}
                    </Box>
                    <Typography
                      variant='caption'
                      sx={{
                        mt: 0.5,
                        fontSize: 10,
                        color: i <= statusIdx ? '#1E293B' : '#94A3B8',
                        fontWeight: i === statusIdx ? 700 : 400,
                        textAlign: 'center',
                      }}
                    >
                      {STATUS[s]?.label || s}
                    </Typography>
                  </Box>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: i < statusIdx ? '#3B82F6' : '#E2E8F0',
                        mb: 2.5,
                        transition: 'all 0.2s',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>
          </Box>
        )}

        {/* Order info */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
          <Typography
            variant='caption'
            fontWeight={700}
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#000000',
              display: 'block',
              mb: 1.5,
            }}
          >
            Order Information
          </Typography>
          <Stack spacing={1}>
            {[
              ['Order Number', order.order_number],
              ['Customer', order.customer_name],
              ['Warehouse', order.warehouse?.name || '—'],
              ['Order Date', fmtDateTime(order.order_date)],
              ['Delivery Date', fmtDate(order.delivery_date)],
              [
                'Created By',
                order.created_by_user
                  ? `${order.created_by_user.first_name} ${order.created_by_user.last_name}`
                  : '—',
              ],
              ['Notes', order.notes || 'None'],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant='body2' color='text.secondary' flexShrink={0}>
                  {label}
                </Typography>
                <Typography variant='body2' fontWeight={600} textAlign='right'>
                  {value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Line items */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
          <Typography
            variant='caption'
            fontWeight={700}
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#000000',
              display: 'block',
              mb: 1.5,
            }}
          >
            Items ({items.length})
          </Typography>
          <Stack spacing={0}>
            {items.map((item, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.25,
                  borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}
              >
                <Box>
                  <Typography variant='body2' fontWeight={600}>
                    {item.product_name}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {item.quantity} × {fmt(item.unit_price)} · SKU: {item.sku}
                  </Typography>
                </Box>
                <Typography variant='body2' fontWeight={700}>
                  {fmt(item.total_price ?? item.quantity * item.unit_price)}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              pt: 1.5,
              borderTop: '2px solid #E2E8F0',
              mt: 1,
            }}
          >
            <Typography fontWeight={800} fontSize={15}>
              Total: {fmt(order.total_amount)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Action buttons */}
      {(canFulfill || canDeliver || canCancel) && (
        <Box
          sx={{ p: 2, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1, flexWrap: 'wrap' }}
        >
          {canFulfill && (
            <Button
              onClick={() => {
                onClose();
                onFulfill(order);
              }}
              variant='contained'
              color='success'
              size='small'
              startIcon={<ShipIcon />}
              sx={{ borderRadius: 2, flex: 1 }}
            >
              Fulfill & Dispatch
            </Button>
          )}
          {canDeliver && (
            <Button
              onClick={() => {
                onClose();
                onDeliver(order);
              }}
              variant='contained'
              size='small'
              startIcon={<DoneIcon />}
              sx={{ borderRadius: 2, flex: 1 }}
            >
              Mark Delivered
            </Button>
          )}
          {canCancel && (
            <Button
              onClick={() => {
                onClose();
                onCancel(order);
              }}
              variant='outlined'
              color='error'
              size='small'
              startIcon={<CancelIcon />}
              sx={{ borderRadius: 2, flex: 1 }}
            >
              Cancel Order
            </Button>
          )}
        </Box>
      )}
    </Drawer>
  );
}

// ── Main SalesOrders page ────────────────────────────────────────────────────

export default function SalesOrders() {
  const { user } = useSelector((s) => s.auth);
  const userRole = user?.role || 'staff';
  const isAdmin = userRole === 'admin';
  const isMgr = userRole === 'manager';
  const canCreate = isAdmin || isMgr || userRole === 'staff';

  const { snack, show: showSnack, hide: hideSnack } = useSnack();

  // ── Reference data ──
  const [warehouses, setWarehouses] = useState([]);
  const [userWarehouseIds, setUserWHIds] = useState([]);

  useEffect(() => {
    warehouseAPI
      .getAll({ limit: 200 })
      .then((r) => {
        const all = r.data.data || [];
        setWarehouses(all);
        if (!isAdmin)
          setUserWHIds(all.filter((w) => w.manager_id === user?.id).map((w) => w.warehouse_id));
      })
      .catch(() => {});
  }, [isAdmin, user?.id]);

  // ── Orders state ──
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Filters ──
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [debSearch, setDeb] = useState('');
  const [whFilter, setWhFilter] = useState('');
  const [fromDate, setFrom] = useState('');
  const [toDate, setTo] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const debRef = useRef(null);

  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      setDeb(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(debRef.current);
  }, [search]);

  // Tab counts (derived from last full fetch or separate counts)
  const [tabCounts, setTabCounts] = useState({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        status: tab !== 'all' ? tab : undefined,
        search: debSearch || undefined,
        warehouseId: whFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };
      const res = await salesOrderAPI.getAll(params);
      const d = res.data.data;
      setOrders(d.orders);
      setTotal(d.total);
    } catch (e) {
      showSnack(e.response?.data?.error || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, tab, debSearch, whFilter, fromDate, toDate]);

  // Fetch tab counts once on mount and after mutations
  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ['draft', 'pending', 'dispatched', 'delivered', 'cancelled'];
      const results = await Promise.all(
        statuses.map((s) => salesOrderAPI.getAll({ status: s, limit: 1 })),
      );
      const counts = {};
      statuses.forEach((s, i) => {
        counts[s] = results[i].data.data.total;
      });
      setTabCounts(counts);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const refresh = () => {
    fetchOrders();
    fetchCounts();
  };

  const resetFilters = () => {
    setTab('all');
    setSearch('');
    setDeb('');
    setWhFilter('');
    setFrom('');
    setTo('');
    setPage(0);
  };
  const hasFilters = tab !== 'all' || debSearch || whFilter || fromDate || toDate;

  // ── Modal / dialog state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [fulfillTarget, setFulfill] = useState(null);
  const [cancelTarget, setCancel] = useState(null);
  const [viewTarget, setView] = useState(null);
  const [actionLoading, setActLoading] = useState('');

  // ── Actions ──
  const handleFulfillConfirm = async () => {
    setActLoading('fulfill');
    try {
      await salesOrderAPI.fulfill(fulfillTarget.order_id);
      showSnack(`Order ${fulfillTarget.order_number} dispatched successfully`);
      setFulfill(null);
      refresh();
    } catch (e) {
      showSnack(e.response?.data?.error || 'Fulfillment failed', 'error');
    } finally {
      setActLoading('');
    }
  };

  const handleDeliverConfirm = async (order) => {
    setActLoading(`deliver-${order.order_id}`);
    try {
      await salesOrderAPI.deliver(order.order_id);
      showSnack(`Order ${order.order_number} marked as delivered`);
      refresh();
    } catch (e) {
      showSnack(e.response?.data?.error || 'Deliver failed', 'error');
    } finally {
      setActLoading('');
    }
  };

  const handleCancelConfirm = async (reason) => {
    setActLoading('cancel');
    try {
      await salesOrderAPI.cancel(cancelTarget.order_id, { reason: reason || undefined });
      showSnack(`Order ${cancelTarget.order_number} cancelled`);
      setCancel(null);
      refresh();
    } catch (e) {
      showSnack(e.response?.data?.error || 'Cancellation failed', 'error');
    } finally {
      setActLoading('');
    }
  };

  // Table cells style
  const tc = { fontSize: 13, color: '#000000', borderBottom: '1px solid #F1F5F9', py: 1.25 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── Page header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            variant='h5'
            fontWeight={800}
            sx={{ color: '#000000', letterSpacing: '-0.3px' }}
          >
            Sales Orders
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {total} order{total !== 1 ? 's' : ''} total
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            size='small'
            startIcon={<RefreshIcon />}
            onClick={refresh}
            sx={{ borderRadius: 2, fontSize: 13, textTransform: 'none' }}
            disabled={loading}
          >
            Refresh
          </Button>
          {canCreate && (
            <Button
              variant='contained'
              size='small'
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                borderRadius: 2,
                fontSize: 13,
                textTransform: 'none',
                bgcolor: '#3B82F6',
                color: '#ffffff',
                '&:hover': { bgcolor: '#2563EB' },
              }}
            >
              Create Order
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Status tabs ── */}
      <Box sx={{ display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0', flexWrap: 'wrap' }}>
        {TABS.map(({ id, label }) => {
          const count = id === 'all' ? total : (tabCounts[id] ?? 0);
          return (
            <Box
              key={id}
              onClick={() => {
                setTab(id);
                setPage(0);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 1.25,
                cursor: 'pointer',
                borderBottom: tab === id ? '2px solid #3B82F6' : '2px solid transparent',
                mb: '-2px',
                color: tab === id ? '#3B82F6' : '#64748B',
                fontWeight: tab === id ? 700 : 500,
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.15s',
                '&:hover': { color: '#000000' },
                whiteSpace: 'nowrap',
              }}
            >
              {label}
              {count > 0 && (
                <Chip
                  label={count}
                  size='small'
                  sx={{
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    bgcolor: tab === id ? '#DBEAFE' : '#F1F5F9',
                    color: tab === id ? '#1E40AF' : '#64748B',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Filters toolbar ── */}
      <Paper
        variant='outlined'
        sx={{
          p: 1.5,
          borderRadius: 2,
          display: 'flex',
          gap: 1.5,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <TextField
          placeholder='Search order # or customer…'
          size='small'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon sx={{ fontSize: 16, color: '#64748B' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: '1 1 220px',
            '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#ffffff' },
          }}
        />

        {isAdmin && (
          <TextField
            select
            size='small'
            label='Warehouse'
            value={whFilter}
            onChange={(e) => {
              setWhFilter(e.target.value);
              setPage(0);
            }}
            sx={{ flex: '0 0 180px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            <MenuItem value=''>All Warehouses</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.warehouse_id} value={w.warehouse_id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          type='date'
          size='small'
          label='From'
          value={fromDate}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: '0 0 150px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        <TextField
          type='date'
          size='small'
          label='To'
          value={toDate}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: '0 0 150px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        {hasFilters && (
          <Button
            variant='outlined'
            size='small'
            startIcon={<ResetIcon />}
            onClick={resetFilters}
            sx={{
              borderRadius: 2,
              fontSize: 12,
              textTransform: 'none',
              color: '#000000',
              borderColor: '#E2E8F0',
            }}
          >
            Reset
          </Button>
        )}
      </Paper>

      {/* ── Table ── */}
      <Paper variant='outlined' sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {loading && <LinearProgress sx={{ height: 2 }} />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {[
                  'Order #',
                  'Customer',
                  'Warehouse',
                  'Items',
                  'Total',
                  'Delivery',
                  'Status',
                  'Created By',
                  'Actions',
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      bgcolor: '#F8FAFC',
                      fontWeight: 700,
                      fontSize: 11,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      py: 1.25,
                      borderBottom: '1px solid #E2E8F0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    sx={{ textAlign: 'center', py: 6, color: '#000000', borderBottom: 'none' }}
                  >
                    <CartIcon
                      sx={{ fontSize: 40, opacity: 0.2, display: 'block', mx: 'auto', mb: 1 }}
                    />
                    <Typography variant='body2'>No sales orders found</Typography>
                    {hasFilters && (
                      <Button
                        size='small'
                        onClick={resetFilters}
                        sx={{ mt: 1, textTransform: 'none', fontSize: 12 }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const items = parseItems(order.items);
                  const canFulfill =
                    (isAdmin || isMgr) && ['draft', 'pending'].includes(order.status);
                  const canDeliver = (isAdmin || isMgr) && order.status === 'dispatched';
                  const canCancel =
                    (isAdmin || isMgr) && !['delivered', 'cancelled'].includes(order.status);

                  return (
                    <TableRow
                      key={order.order_id}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#F8FAFC' },
                        '&:last-child td': { borderBottom: 'none' },
                      }}
                      onClick={() => setView(order)}
                    >
                      <TableCell sx={tc}>
                        <Typography
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#000000',
                          }}
                        >
                          {order.order_number}
                        </Typography>
                        <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>
                          {fmtDate(order.order_date)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{
                          ...tc,
                          fontWeight: 600,
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {order.customer_name}
                      </TableCell>
                      <TableCell sx={{ ...tc, color: '#000000', fontSize: 12 }}>
                        {order.warehouse?.name || '—'}
                      </TableCell>
                      <TableCell sx={tc}>
                        <Chip
                          label={items.length}
                          size='small'
                          sx={{
                            bgcolor: '#F1F5F9',
                            color: '#475569',
                            fontWeight: 700,
                            fontSize: 11,
                            height: 20,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{ ...tc, fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}
                      >
                        {fmt(order.total_amount)}
                      </TableCell>
                      <TableCell sx={{ ...tc, color: '#000000', fontSize: 12 }}>
                        {fmtDate(order.delivery_date)}
                      </TableCell>
                      <TableCell sx={tc}>
                        <StatusChip status={order.status} />
                      </TableCell>
                      <TableCell sx={{ ...tc, color: '#000000', fontSize: 12 }}>
                        {order.created_by_user
                          ? `${order.created_by_user.first_name} ${order.created_by_user.last_name}`
                          : '—'}
                      </TableCell>
                      <TableCell sx={tc} onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Tooltip title='View details'>
                            <IconButton
                              size='small'
                              onClick={() => setView(order)}
                              sx={{
                                color: '#64748B',
                                '&:hover': { bgcolor: '#F1F5F9', color: '#1E293B' },
                              }}
                            >
                              <ViewIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                          {canFulfill && (
                            <Tooltip title='Fulfill & Dispatch'>
                              <IconButton
                                size='small'
                                onClick={() => setFulfill(order)}
                                sx={{
                                  color: '#64748B',
                                  '&:hover': { bgcolor: '#F1F5F9', color: '#1E293B' },
                                }}
                              >
                                <ShipIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDeliver && (
                            <Tooltip title='Mark Delivered'>
                              <IconButton
                                size='small'
                                disabled={actionLoading === `deliver-${order.order_id}`}
                                onClick={() => handleDeliverConfirm(order)}
                                sx={{
                                  color: '#64748B',
                                  '&:hover': { bgcolor: '#F1F5F9', color: '#1E293B' },
                                }}
                              >
                                {actionLoading === `deliver-${order.order_id}` ? (
                                  <CircularProgress size={14} />
                                ) : (
                                  <DoneIcon fontSize='small' />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                          {canCancel && (
                            <Tooltip title='Cancel Order'>
                              <IconButton
                                size='small'
                                onClick={() => setCancel(order)}
                                sx={{
                                  color: '#64748B',
                                  '&:hover': { bgcolor: '#F1F5F9', color: '#1E293B' },
                                }}
                              >
                                <CancelIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component='div'
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
          sx={{ borderTop: '1px solid #E2E8F0', '& .MuiTablePagination-toolbar': { fontSize: 13 } }}
        />
      </Paper>

      {/* ── Modals & Dialogs ── */}
      <CreateOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(msg) => {
          showSnack(msg);
          setCreateOpen(false);
          refresh();
        }}
        warehouses={warehouses}
        userRole={userRole}
        userWarehouseIds={userWarehouseIds}
      />

      <FulfillDialog
        order={fulfillTarget}
        open={!!fulfillTarget}
        onClose={() => setFulfill(null)}
        onConfirm={handleFulfillConfirm}
        loading={actionLoading === 'fulfill'}
      />

      <CancelDialog
        order={cancelTarget}
        open={!!cancelTarget}
        onClose={() => setCancel(null)}
        onConfirm={handleCancelConfirm}
        loading={actionLoading === 'cancel'}
      />

      <OrderDrawer
        order={viewTarget}
        open={!!viewTarget}
        onClose={() => setView(null)}
        onFulfill={(o) => {
          setView(null);
          setFulfill(o);
        }}
        onCancel={(o) => {
          setView(null);
          setCancel(o);
        }}
        onDeliver={handleDeliverConfirm}
        userRole={userRole}
      />

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={hideSnack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={hideSnack}
          severity={snack.severity}
          variant='filled'
          sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
