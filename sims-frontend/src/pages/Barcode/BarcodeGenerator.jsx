import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import * as bwipjs from 'bwip-js';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Printer, Download } from 'lucide-react';

const BarcodeGenerator = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [format, setFormat] = useState('CODE128');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canvasRef = useRef(null);

  // Bulk generation
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  // Search products
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/api/products', {
        params: { search: query, limit: 10 },
      });
      setSearchResults(response.data.data || []);
    } catch (err) {
      setError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  // Select product and generate barcode
  const handleSelectProduct = async (product) => {
    setSelectedProduct(product);
    setSearchResults([]);
    setSearchQuery('');

    try {
      setLoading(true);
      const response = await axios.get('/api/barcodes/generate', {
        params: { product_id: product.product_id },
      });
      setBarcode(response.data.barcode);
      generateBarcodeImage(response.data.barcode, format);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate barcode');
    } finally {
      setLoading(false);
    }
  };

  // Generate barcode image
  const generateBarcodeImage = (barcodeValue, barcodeFormat) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const imgData = bwipjs.toCanvas(canvas, {
        bcid: barcodeFormat.toLowerCase(),
        text: barcodeValue,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });

      setSuccess('Barcode generated successfully');
    } catch (err) {
      setError(`Barcode generation failed: ${err.message}`);
    }
  };

  // Update barcode format
  const handleFormatChange = (newFormat) => {
    setFormat(newFormat);
    if (barcode) {
      generateBarcodeImage(barcode, newFormat);
    }
  };

  // Print barcode
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=400,height=300');
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Label</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; }
            .label { text-align: center; padding: 20px; border: 1px solid #ccc; }
            img { max-width: 100%; }
            p { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="label">
            <h3>${selectedProduct?.name}</h3>
            <p>SKU: ${selectedProduct?.sku}</p>
            <img src="${imageData}" alt="Barcode" />
            <p>${barcode}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Download barcode
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `barcode-${selectedProduct?.sku}-${barcode}.png`;
    link.click();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>Barcode Generator</Typography>

          {/* Mode Toggle */}
          <FormControlLabel
            control={<Checkbox checked={bulkMode} onChange={(e) => setBulkMode(e.target.checked)} />}
            label="Bulk Generation"
            sx={{ mb: 2 }}
          />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {!bulkMode ? (
            <>
              {/* Single Product Mode */}
              <Typography variant="h6" sx={{ mb: 2 }}>Search Product</Typography>
              <TextField
                label="Product Name or SKU"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                fullWidth
                placeholder="Search products..."
                sx={{ mb: 2 }}
              />

              {searchResults.length > 0 && (
                <Paper sx={{ mb: 2, maxHeight: '300px', overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell>SKU</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {searchResults.map((product) => (
                        <TableRow key={product.product_id}>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleSelectProduct(product)}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {selectedProduct && (
                <>
                  <Card sx={{ mb: 2, bgcolor: '#f9f9f9' }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography color="textSecondary">Product Name</Typography>
                          <Typography variant="h6">{selectedProduct.name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography color="textSecondary">SKU</Typography>
                          <Typography variant="h6">{selectedProduct.sku}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography color="textSecondary">Barcode</Typography>
                          <Typography variant="h6">{barcode}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Format</InputLabel>
                            <Select
                              value={format}
                              onChange={(e) => handleFormatChange(e.target.value)}
                            >
                              <MenuItem value="CODE128">CODE128</MenuItem>
                              <MenuItem value="EAN13">EAN13</MenuItem>
                              <MenuItem value="QR">QR Code</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Barcode Canvas */}
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                    <canvas
                      ref={canvasRef}
                      style={{
                        border: '1px solid #ddd',
                        padding: '10px',
                        maxWidth: '100%',
                        borderRadius: '4px',
                      }}
                    />
                  </Box>

                  {/* Action Buttons */}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="contained"
                        startIcon={<Printer size={20} />}
                        onClick={handlePrint}
                        fullWidth
                      >
                        Print
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        startIcon={<Download size={20} />}
                        onClick={handleDownload}
                        fullWidth
                      >
                        Download
                      </Button>
                    </Grid>
                  </Grid>
                </>
              )}
            </>
          ) : (
            <>
              {/* Bulk Mode */}
              <Typography variant="h6" sx={{ mb: 2 }}>Select Products for Bulk Generation</Typography>
              <Typography color="textSecondary" sx={{ mb: 2 }}>
                (Feature: Load products and select multiple to generate sheet)
              </Typography>
              <Alert severity="info">
                Bulk barcode generation will create a printable sheet with multiple barcodes.
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BarcodeGenerator;
