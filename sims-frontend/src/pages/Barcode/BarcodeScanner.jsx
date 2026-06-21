import React, { useState, useRef, useCallback } from 'react';
import { useZxing } from 'react-zxing';
import {
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Paper,
  Grid,
} from '@mui/material';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { barcodeAPI } from '../../services/api';

const BarcodeScanner = () => {
  const [mode, setMode] = useState(0); // 0: Stock In, 1: Stock Out, 2: Audit
  const [useCamera, setUseCamera] = useState(false); // default off — camera needs HTTPS
  const [barcode, setBarcode] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unknownBarcode, setUnknownBarcode] = useState(false);

  // Stock-in form
  const [quantity, setQuantity] = useState('1');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Stock-out form
  const [stockOutQty, setStockOutQty] = useState('1');
  const [referenceNo, setReferenceNo] = useState('');

  // Audit form
  const [countedQty, setCountedQty] = useState('');
  const [auditVariance, setAuditVariance] = useState(null);

  // Recent scans (session only, last 10)
  const [recentScans, setRecentScans] = useState([]);

  const barcodeInputRef = useRef(null);
  const warehouseId = useRef(localStorage.getItem('warehouseId') || '1');

  // react-zxing camera scanner hook
  const { ref: cameraRef } = useZxing({
    paused: !useCamera,
    onDecodeResult(result) {
      const decoded = result.getText();
      setBarcode(decoded);
      lookupBarcode(decoded);
    },
    onError(err) {
      console.error('Camera scanner error:', err);
    },
  });

  const lookupBarcode = useCallback(async (barcodeValue) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setUnknownBarcode(false);

      const response = await barcodeAPI.lookup(barcodeValue);

      if (response.data?.success) {
        const product = response.data.data;
        setProductInfo({
          product_id: product.product_id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unit: product.unit,
          image_url: product.image_url,
        });
        // Pre-fill system qty for audit
        const totalStock = product.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;
        setCountedQty(String(totalStock));
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setUnknownBarcode(true);
        setProductInfo(null);
        setError('Barcode/SKU not recognized. Please assign it to a product.');
      } else {
        setError(err.response?.data?.error || 'Failed to lookup barcode');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const addRecentScan = useCallback((scan) => {
    setRecentScans((prev) => [scan, ...prev.slice(0, 9)]);
  }, []);

  const handleStockIn = async () => {
    if (!productInfo) {
      setError('Please scan a valid barcode first');
      return;
    }

    try {
      setLoading(true);
      const response = await barcodeAPI.scan({
        barcode,
        warehouse_id: parseInt(warehouseId.current),
        scan_type: 'stock_in',
        quantity: parseInt(quantity),
      });

      if (response.data?.success) {
        const data = response.data;
        const qtyNum = parseInt(quantity);
        setSuccess(`${productInfo.name} — +${qtyNum} updated. New stock: ${data.after_qty}`);
        addRecentScan({
          id: Date.now(),
          sku: productInfo.sku,
          name: productInfo.name,
          action: 'Stock In',
          qty: `+${qtyNum}`,
          time: new Date(),
        });
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Stock-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStockOut = async () => {
    if (!productInfo) {
      setError('Please scan a valid barcode first');
      return;
    }

    try {
      setLoading(true);
      const response = await barcodeAPI.scan({
        barcode,
        warehouse_id: parseInt(warehouseId.current),
        scan_type: 'stock_out',
        quantity: parseInt(stockOutQty),
      });

      if (response.data?.success) {
        const data = response.data;
        const qtyNum = parseInt(stockOutQty);
        setSuccess(`${productInfo.name} — -${qtyNum} updated. New stock: ${data.after_qty}`);
        addRecentScan({
          id: Date.now(),
          sku: productInfo.sku,
          name: productInfo.name,
          action: 'Stock Out',
          qty: `-${qtyNum}`,
          time: new Date(),
        });
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Stock-out failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!productInfo) {
      setError('Please scan a valid barcode first');
      return;
    }

    try {
      setLoading(true);
      const response = await barcodeAPI.scan({
        barcode,
        warehouse_id: parseInt(warehouseId.current),
        scan_type: 'audit',
        quantity: parseInt(countedQty),
      });

      if (response.data?.success) {
        setAuditVariance(response.data.variance);
        setSuccess(
          `Audit recorded. Variance: ${response.data.variance > 0 ? '+' : ''}${response.data.variance}`,
        );
        addRecentScan({
          id: Date.now(),
          sku: productInfo.sku,
          name: productInfo.name,
          action: 'Audit',
          qty: `Var: ${response.data.variance}`,
          time: new Date(),
        });
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Audit failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBarcode('');
    setProductInfo(null);
    setQuantity('1');
    setBatchNo('');
    setExpiryDate('');
    setStockOutQty('1');
    setReferenceNo('');
    setCountedQty('');
    setAuditVariance(null);
    // Auto-focus barcode input for next scan
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 4000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant='h5' sx={{ mb: 2 }}>
            Barcode Scanner
          </Typography>

          {/* Mode Selection */}
          <Tabs value={mode} onChange={(e, v) => setMode(v)} sx={{ mb: 2 }}>
            <Tab label='Stock In' />
            <Tab label='Stock Out' />
            <Tab label='Audit' />
          </Tabs>

          {/* Camera/Manual Toggle */}
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch checked={useCamera} onChange={(e) => setUseCamera(e.target.checked)} />
              }
              label='Use Camera'
            />
          </Box>

          {/* Camera Scanner (react-zxing) */}
          {useCamera && (
            <Box
              sx={{
                width: '100%',
                maxWidth: '500px',
                mb: 2,
                border: '2px solid #ccc',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <video ref={cameraRef} style={{ width: '100%', display: 'block' }} />
            </Box>
          )}

          {/* Manual Input — onKeyDown triggers instant lookup on Enter */}
          <TextField
            inputRef={barcodeInputRef}
            label='Barcode / SKU'
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && barcode.trim()) {
                e.preventDefault();
                lookupBarcode(barcode.trim());
              }
            }}
            fullWidth
            placeholder='Scan barcode or type SKU, then press Enter'
            sx={{ mb: 2 }}
            autoFocus
          />

          <Button
            variant='contained'
            onClick={() => lookupBarcode(barcode)}
            disabled={!barcode || loading}
            fullWidth
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Lookup'}
          </Button>

          {/* Messages */}
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

          {/* Unknown Barcode Warning */}
          {unknownBarcode && (
            <Alert severity='warning' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertCircle size={20} />
              Barcode not recognized. Please report or assign to a product.
            </Alert>
          )}

          {/* Product Info Card */}
          {productInfo && (
            <Card sx={{ mb: 2, bgcolor: '#000000' }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography color='textSecondary' gutterBottom>
                      Product Name
                    </Typography>
                    <Typography variant='h6'>{productInfo.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color='textSecondary' gutterBottom>
                      SKU
                    </Typography>
                    <Typography variant='h6'>{productInfo.sku}</Typography>
                  </Grid>
                  {productInfo.image_url && (
                    <Grid item xs={12}>
                      <img
                        src={productInfo.image_url}
                        alt={productInfo.name}
                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }}
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Forms by Mode */}
          {productInfo && (
            <Paper sx={{ p: 2 }}>
              {mode === 0 && (
                <>
                  <Typography variant='h6' sx={{ mb: 2 }}>
                    Stock In
                  </Typography>
                  <TextField
                    label='Quantity'
                    type='number'
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label='Batch #'
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label='Expiry Date'
                    type='date'
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant='contained'
                    color='success'
                    onClick={handleStockIn}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <Loader size={20} /> : 'Confirm Stock In'}
                  </Button>
                </>
              )}

              {mode === 1 && (
                <>
                  <Typography variant='h6' sx={{ mb: 2 }}>
                    Stock Out
                  </Typography>
                  <TextField
                    label='Quantity'
                    type='number'
                    value={stockOutQty}
                    onChange={(e) => setStockOutQty(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label='Reference #'
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant='contained'
                    color='warning'
                    onClick={handleStockOut}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <Loader size={20} /> : 'Confirm Stock Out'}
                  </Button>
                </>
              )}

              {mode === 2 && (
                <>
                  <Typography variant='h6' sx={{ mb: 2 }}>
                    Audit
                  </Typography>
                  <Typography color='textSecondary' sx={{ mb: 1 }}>
                    System Qty: {countedQty}
                  </Typography>
                  <TextField
                    label='Counted Quantity'
                    type='number'
                    value={countedQty}
                    onChange={(e) => setCountedQty(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  {auditVariance !== null && (
                    <Alert severity={auditVariance === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                      <CheckCircle size={20} style={{ marginRight: '8px' }} />
                      Variance: {auditVariance > 0 ? '+' : ''}
                      {auditVariance}
                    </Alert>
                  )}
                  <Button
                    variant='contained'
                    color='info'
                    onClick={handleAudit}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <Loader size={20} /> : 'Record Audit'}
                  </Button>
                </>
              )}
            </Paper>
          )}

          {/* Recent Scans Table */}
          {recentScans.length > 0 && (
            <Paper sx={{ mt: 3, overflow: 'hidden' }}>
              <Typography
                variant='subtitle2'
                sx={{
                  p: 2,
                  pb: 0,
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                }}
              >
                Recent Scans (Session)
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#000000',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        SKU
                      </th>
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#000000',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        Product Name
                      </th>
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#000000',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        Action
                      </th>
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#000000',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        Qty
                      </th>
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#000000',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <code
                            style={{
                              background: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: 3,
                              fontSize: '0.78rem',
                            }}
                          >
                            {s.sku}
                          </code>
                        </td>
                        <td style={{ padding: '8px 12px' }}>{s.name}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 3,
                              color: '#fff',
                              backgroundColor:
                                s.action === 'Stock In'
                                  ? '#10b981'
                                  : s.action === 'Stock Out'
                                    ? '#f59e0b'
                                    : '#6366f1',
                            }}
                          >
                            {s.action}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                          {s.qty}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: '#000000' }}>
                          {new Date(s.time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BarcodeScanner;
