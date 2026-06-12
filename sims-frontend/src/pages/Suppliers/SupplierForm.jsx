import React, { useEffect } from 'react';
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
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import { X } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Company Name is required'),
  contact_person: Yup.string().required('Contact Person is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone: Yup.string().required('Phone number is required'),
  address: Yup.string().optional(),
  country: Yup.string().optional(),
  payment_terms: Yup.string().optional(),
  lead_time: Yup.number().min(0, 'Must be positive').integer('Must be an integer').optional(),
  rating: Yup.number().min(1).max(5).optional(),
  notes: Yup.string().optional(),
  status: Yup.string().valid('active', 'inactive', 'blacklisted').optional(),
});

const SupplierForm = ({ open, onClose, supplier, onSubmit }) => {
  const formik = useFormik({
    initialValues: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      country: '',
      payment_terms: 'net30',
      lead_time: '',
      rating: 3,
      status: 'active',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values);
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (supplier) {
      formik.setValues({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        country: supplier.country || '',
        payment_terms: supplier.payment_terms || 'net30',
        lead_time: supplier.lead_time || '',
        rating: supplier.rating ? Math.round(supplier.rating) : 3,
        status: supplier.status || 'active',
        notes: supplier.notes || '',
      });
    } else {
      formik.resetForm();
    }
  }, [supplier, open]);

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
          <Grid item xs={12}>
            <TextField
              label="Company Name *"
              id="name"
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

          <Grid item xs={12}>
            <TextField
              label="Contact Person *"
              id="contact_person"
              name="contact_person"
              fullWidth
              size="small"
              value={formik.values.contact_person}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.contact_person && Boolean(formik.errors.contact_person)}
              helperText={formik.touched.contact_person && formik.errors.contact_person}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Email *"
              id="email"
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

          <Grid item xs={12}>
            <TextField
              label="Phone *"
              id="phone"
              name="phone"
              fullWidth
              size="small"
              value={formik.values.phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              helperText={formik.touched.phone && formik.errors.phone}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Address"
              id="address"
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

          <Grid item xs={12}>
            <TextField
              label="Country"
              id="country"
              name="country"
              fullWidth
              size="small"
              value={formik.values.country}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="payment-terms-label">Payment Terms</InputLabel>
              <Select
                labelId="payment-terms-label"
                id="payment_terms"
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

          <Grid item xs={12} sm={6}>
            <TextField
              label="Lead Time (days)"
              id="lead_time"
              name="lead_time"
              type="number"
              fullWidth
              size="small"
              value={formik.values.lead_time}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.lead_time && Boolean(formik.errors.lead_time)}
              helperText={formik.touched.lead_time && formik.errors.lead_time}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography component="legend" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Rating</Typography>
            <Rating
              name="rating"
              value={formik.values.rating}
              onChange={(event, newValue) => {
                formik.setFieldValue('rating', newValue);
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
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

          <Grid item xs={12}>
            <TextField
              label="Notes"
              id="notes"
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
              Save Supplier
            </Button>
          </Grid>
        </Grid>
      </form>
    </Drawer>
  );
};

export default SupplierForm;
