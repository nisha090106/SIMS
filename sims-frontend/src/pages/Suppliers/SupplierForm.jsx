import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Grid,
  FormHelperText,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { X, Star } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Company Name is required'),
  contact_person: Yup.string().optional(),
  email: Yup.string().email('Must be a valid email address').required('Email is required'),
  phone: Yup.string().optional(),
  address: Yup.string().optional(),
  payment_terms: Yup.string().optional(),
  lead_time: Yup.number()
    .min(0, 'Must be 0 or more')
    .integer('Must be a whole number')
    .nullable()
    .transform((value, original) => (original === '' ? null : value)),
  status: Yup.string().oneOf(['active', 'inactive', 'blacklisted']).optional(),
  notes: Yup.string().optional(),
});

const SupplierForm = ({ open, onClose, supplier, onSubmit, onRatingUpdate }) => {
  // Rating is handled separately via PATCH – not part of the Formik form
  const [rating, setRating] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: 'net30',
      lead_time: '',
      status: 'active',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        // Build the payload (no rating – that goes via PATCH)
        const payload = { ...values };
        // Convert empty lead_time to null for the backend
        if (payload.lead_time === '' || payload.lead_time === null) {
          payload.lead_time = 0;
        }

        await onSubmit(payload);

        // If editing and rating was changed, call the PATCH endpoint
        if (supplier && rating !== Math.round(supplier.rating || 0) && rating > 0) {
          await handleRatingSave(supplier.supplier_id, rating);
        }

        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (open) {
      setRatingError('');
      setRatingSuccess(false);

      if (supplier) {
        formik.setValues({
          name: supplier.name || '',
          contact_person: supplier.contact_person || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          payment_terms: supplier.payment_terms || 'net30',
          lead_time: supplier.lead_time != null ? supplier.lead_time : '',
          status: supplier.status || 'active',
          notes: supplier.notes || '',
        });
        setRating(supplier.rating ? Math.round(supplier.rating) : 0);
      } else {
        formik.resetForm();
        setRating(0);
      }
    }
  }, [supplier, open]);

  const handleRatingSave = async (supplierId, newRating) => {
    if (!supplierId || !newRating || newRating < 1) return;
    try {
      setRatingSaving(true);
      setRatingError('');
      await api.patch(`/suppliers/${supplierId}/rating`, { rating: newRating });
      if (onRatingUpdate) {
        onRatingUpdate(supplierId, newRating);
      }
      setRatingSuccess(true);
    } catch (err) {
      setRatingError(err.response?.data?.error || 'Failed to update rating');
    } finally {
      setRatingSaving(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 }, p: 3, boxSizing: 'border-box' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {supplier ? 'Edit Supplier' : 'Add New Supplier'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={2.5}>
          {/* Name (required) */}
          <Grid item xs={12}>
            <TextField
              label="Company Name *"
              id="supplier-name"
              name="name"
              fullWidth
              size="small"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />
          </Grid>

          {/* Contact Person */}
          <Grid item xs={12}>
            <TextField
              label="Contact Person"
              id="supplier-contact-person"
              name="contact_person"
              fullWidth
              size="small"
              value={formik.values.contact_person}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </Grid>

          {/* Email (required, validated) */}
          <Grid item xs={12}>
            <TextField
              label="Email *"
              id="supplier-email"
              name="email"
              type="email"
              fullWidth
              size="small"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
          </Grid>

          {/* Phone */}
          <Grid item xs={12}>
            <TextField
              label="Phone"
              id="supplier-phone"
              name="phone"
              fullWidth
              size="small"
              value={formik.values.phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </Grid>

          {/* Address */}
          <Grid item xs={12}>
            <TextField
              label="Address"
              id="supplier-address"
              name="address"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </Grid>

          {/* Payment Terms (dropdown) */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="payment-terms-label">Payment Terms</InputLabel>
              <Select
                labelId="payment-terms-label"
                id="supplier-payment-terms"
                name="payment_terms"
                value={formik.values.payment_terms}
                onChange={formik.handleChange}
                label="Payment Terms"
              >
                <MenuItem value="net15">Net 15</MenuItem>
                <MenuItem value="net30">Net 30</MenuItem>
                <MenuItem value="net60">Net 60</MenuItem>
                <MenuItem value="COD">COD</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Lead Time (days, numeric) */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Lead Time (days)"
              id="supplier-lead-time"
              name="lead_time"
              type="number"
              fullWidth
              size="small"
              inputProps={{ min: 0, step: 1 }}
              value={formik.values.lead_time}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.lead_time && Boolean(formik.errors.lead_time)}
              helperText={formik.touched.lead_time && formik.errors.lead_time}
            />
          </Grid>

          {/* Status (dropdown) */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="supplier-status"
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="blacklisted">Blacklisted</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              label="Notes"
              id="supplier-notes"
              name="notes"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={formik.values.notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </Grid>

          {/* Rating Section — separated from main form body */}
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
          </Grid>
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                bgcolor: '#f8f9fa',
                borderRadius: 2,
                border: '1px solid #e0e0e0',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Star size={16} style={{ color: '#faaf00' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Supplier Rating
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {supplier
                  ? 'Rating is saved separately via its own endpoint. Click the stars then save the form.'
                  : 'Rating can be set after the supplier is created, from the edit view or detail page.'}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Rating
                  name="supplier-rating"
                  value={rating}
                  onChange={(event, newValue) => setRating(newValue)}
                  disabled={!supplier} // disable for new suppliers
                  size="large"
                  sx={{
                    '& .MuiRating-iconFilled': { color: '#faaf00' },
                    '& .MuiRating-iconEmpty': { color: '#ddd' },
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {rating > 0 ? `${rating} / 5` : 'No rating'}
                </Typography>
                {ratingSaving && <CircularProgress size={16} />}
              </Box>

              {ratingError && (
                <Alert severity="error" sx={{ mt: 1 }} variant="outlined" onClose={() => setRatingError('')}>
                  {ratingError}
                </Alert>
              )}
              {ratingSuccess && (
                <Alert severity="success" sx={{ mt: 1 }} variant="outlined" onClose={() => setRatingSuccess(false)}>
                  Rating updated successfully!
                </Alert>
              )}

              {!supplier && (
                <FormHelperText>Create the supplier first, then edit to set a rating.</FormHelperText>
              )}
            </Box>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12} sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={onClose}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              fullWidth
              disabled={formik.isSubmitting}
              sx={{ textTransform: 'none' }}
            >
              {formik.isSubmitting ? 'Saving...' : 'Save Supplier'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Drawer>
  );
};

export default SupplierForm;
