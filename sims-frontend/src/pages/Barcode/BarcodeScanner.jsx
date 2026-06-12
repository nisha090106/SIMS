import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
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

const BarcodeScanner = () => {
  const [mode, setMode] = useState(0); // 0: Stock In, 1: Stock Out, 2: Audit
  const [useCamera, setUseCamera] = useState(true);
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

  const qrScannerRef = useRef(null);
  const html5QrcodeScanner = useRef(null);
  const warehouseId = useRef(localStorage.getItem('warehouseId') || '1');
  const userId = useRef(localStorage.getItem('userId') || '');

  // Initialize camera scanner
  useEffect(() => {
    if (useCamera && !html5QrcodeScanner.current) {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: ['QR_CODE', 'BAR_CODE'],
      };

      html5QrcodeScanner.current = new Html5Qrcode('qr-reader');
      html5QrcodeScanner.current.start(
        { facingMode: 'environment' },
        config,
        onQrCodeSuccess,
        onQrCodeError
      ).catch(err => {
        console.error('Failed to start camera:', err);
        setError('Unable to access camera. Please use manual input mode.');
      });
    }

    return () => {
      if (html5QrcodeScanner.current && useCamera) {
        html5QrcodeScanner.current.stop();
        html5QrcodeScanner.current = null;
      }
    };
  }, [useCamera]);

  const onQrCodeSuccess = (decodedText) => {
    setBarcode(decodedText);
    lookupBarcode(decodedText);
  };

  const onQrCodeError = (err) => {
    // Silently fail on repeated reads
  };

  const lookupBarcode = async (barcodeValue) => {
    try {
      setLoading(true);
      setError('');
      setUnknownBarcode(false);

      const response = await axios.get(`/api/barcodes/scan/${barcodeValue}`, {
        params: { warehouse_id: warehouseId.current },
      });

      setProductInfo(response.data.product);
      setCountedQty(response.data.inventory.current_qty || '0');
    } catch (err) {
      if (err.response?.status === 404 && err.response?.data?.unknownBarcode) {
        setUnknownBarcode(true);
        setProductInfo(null);
        setError('Barcode not recognized. Please assign it to a product.');
      } else {
        setError(err.response?.data?.error || 'Failed to lookup barcode');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStockIn = async () => {
    if (!productInfo) {
      setError('Please scan a valid barcode first');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/barcodes/stock-in', {
        barcode,
        quantity: parseInt(quantity),
        warehouse_id: warehouseId.current,
        batch_no: batchNo,
        expiry_date: expiryDate,
      });

      setSuccess(`Stock-in completed: ${response.data.before_qty} → ${response.data.after_qty}`);
      resetForm();
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
      const response = await axios.post('/api/barcodes/stock-out', {
        barcode,
        quantity: parseInt(stockOutQty),
        warehouse_id: warehouseId.current,
        reference_no: referenceNo,
      });

      setSuccess(`Stock-out completed: ${response.data.before_qty} → ${response.data.after_qty}`);
      resetForm();
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
      const response = await axios.post('/api/barcodes/audit', {
        barcode,
        counted_quantity: parseInt(countedQty),
        warehouse_id: warehouseId.current,
      });

      setAuditVariance(response.data.variance);
      setSuccess(`Audit recorded. Variance: ${response.data.variance > 0 ? '+' : ''}${response.data.variance}`);
      resetForm();
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
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>Barcode Scanner</Typography>

          {/* Mode Selection */}
          <Tabs value={mode} onChange={(e, v) => setMode(v)} sx={{ mb: 2 }}>
            <Tab label="Stock In" />
            <Tab label="Stock Out" />
            <Tab label="Audit" />
          </Tabs>

          {/* Camera/Manual Toggle */}
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={<Switch checked={useCamera} onChange={(e) => setUseCamera(e.target.checked)} />}
              label="Use Camera"
            />
          </Box>

          {/* Camera Scanner */}
          {useCamera && (
            <Box
              id="qr-reader"
              ref={qrScannerRef}
              sx={{
                width: '100%',
                maxWidth: '500px',
                mb: 2,
                border: '2px solid #ccc',
                borderRadius: 1,
              }}
            />
          )}

          {/* Manual Input */}
          <TextField
            label="Barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') lookupBarcode(barcode);
            }}
            fullWidth
            placeholder="Enter or scan barcode"
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            onClick={() => lookupBarcode(barcode)}
            disabled={!barcode || loading}
            fullWidth
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Lookup'}
          </Button>

          {/* Messages */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* Unknown Barcode Warning */}
          {unknownBarcode && (
            <Alert severity="warning" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertCircle size={20} />
              Barcode not recognized. Please report or assign to a product.
            </Alert>
          )}

          {/* Product Info Card */}
          {productInfo && (
            <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography color="textSecondary" gutterBottom>Product Name</Typography>
                    <Typography variant="h6">{productInfo.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color="textSecondary" gutterBottom>SKU</Typography>
                    <Typography variant="h6">{productInfo.sku}</Typography>
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
                  <Typography variant="h6" sx={{ mb: 2 }}>Stock In</Typography>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Batch #"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Expiry Date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    color="success"
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
                  <Typography variant="h6" sx={{ mb: 2 }}>Stock Out</Typography>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={stockOutQty}
                    onChange={(e) => setStockOutQty(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Reference #"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    color="warning"
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
                  <Typography variant="h6" sx={{ mb: 2 }}>Audit</Typography>
                  <Typography color="textSecondary" sx={{ mb: 1 }}>System Qty: {countedQty}</Typography>
                  <TextField
                    label="Counted Quantity"
                    type="number"
                    value={countedQty}
                    onChange={(e) => setCountedQty(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  {auditVariance !== null && (
                    <Alert severity={auditVariance === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                      <CheckCircle size={20} style={{ marginRight: '8px' }} />
                      Variance: {auditVariance > 0 ? '+' : ''}{auditVariance}
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    color="info"
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
        </CardContent>
      </Card>
    </Box>
  );
};

export default BarcodeScanner;
