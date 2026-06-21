import React, { useEffect, useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Close as CloseIcon,
  AddPhotoAlternateOutlined as ImageIcon,
  AddCircleOutline as AddCatIcon,
} from '@mui/icons-material';
import { productAPI, categoryAPI } from '../../services/api';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

/* ── Validation schema ───────────────────────────────────────── */
const schema = Yup.object({
  name: Yup.string().min(2, 'At least 2 characters').required('Name is required'),
  sku: Yup.string().max(50, 'Max 50 chars').required('SKU is required'),
  category: Yup.string().required('Category is required'),
  unit: Yup.string().required('Unit is required'),
  unit_price: Yup.number()
    .typeError('Must be a number')
    .positive('Must be positive')
    .required('Selling price is required'),
  cost_price: Yup.number().typeError('Must be a number').min(0, 'Must be ≥ 0').nullable(),
  reorder_level: Yup.number()
    .typeError('Must be a number')
    .integer()
    .min(0)
    .required('Reorder level is required'),
  reorder_qty: Yup.number().typeError('Must be a number').integer().min(0),
  barcode: Yup.string().max(100).nullable(),
  description: Yup.string().nullable(),
  is_active: Yup.boolean(),
});

const UNITS = ['piece', 'box', 'kg', 'litre', 'metre', 'set', 'roll', 'pack', 'unit'];

/* ══════════════════════════════════════════════════════════════
   ProductForm
   Props:
     product         – existing product object (edit) or null (create)
     categories      – array of { id, name } from parent
     onSuccess(msg)  – called after save
     onCancel()      – called on close/cancel
     onCategoryCreated(cat) – called when a new category is added inline
══════════════════════════════════════════════════════════════ */
export default function ProductForm({
  product,
  categories,
  onSuccess,
  onCancel,
  onCategoryCreated,
}) {
  const isEdit = Boolean(product);
  const [addAnotherPending, setAddAnotherPending] = useState(false);
  const [newCatModal, setNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatLoading, setNewCatLoading] = useState(false);
  const [newCatError, setNewCatError] = useState('');
  const imageInputRef = useRef(null);

  const formik = useFormik({
    initialValues: {
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      barcode: product?.barcode ?? '',
      category: product?.category ?? '',
      unit: product?.unit ?? 'piece',
      description: product?.description ?? '',
      reorder_level: product?.reorder_level ?? 10,
      reorder_qty: product?.reorder_qty ?? 50,
      unit_price: product?.unit_price ?? '',
      cost_price: product?.cost_price ?? '',
      is_active: product?.is_active ?? true,
      image_url: product?.image_url ?? '',
    },
    validationSchema: schema,
    enableReinitialize: true,
    onSubmit: async (values, helpers) => {
      try {
        const payload = {
          ...values,
          barcode: values.barcode || null,
          cost_price: values.cost_price !== '' ? Number(values.cost_price) : null,
          description: values.description || null,
          image_url: values.image_url || null,
        };

        if (isEdit) {
          await productAPI.update(product.product_id, payload);
          onSuccess('Product updated successfully');
        } else {
          await productAPI.create(payload);
          if (addAnotherPending) {
            helpers.resetForm();
            helpers.setFieldValue('category', values.category); // keep category
            setAddAnotherPending(false);
            onSuccess?.('Product added — form reset for next entry');
          } else {
            onSuccess('Product created successfully');
          }
        }
      } catch (err) {
        const serverErrors = err.response?.data?.errors;
        if (serverErrors) {
          serverErrors.forEach((e) => helpers.setFieldError(e.field, e.message));
        } else {
          helpers.setFieldError('name', err.response?.data?.error || 'Save failed');
        }
      } finally {
        setAddAnotherPending(false);
      }
    },
  });

  /* ── Add-category inline modal ── */
  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      setNewCatError('Name is required');
      return;
    }
    setNewCatLoading(true);
    setNewCatError('');
    try {
      const res = await categoryAPI.create({ name: newCatName.trim() });
      const cat = res.data.data;
      onCategoryCreated?.(cat);
      formik.setFieldValue('category', cat.name);
      setNewCatModal(false);
      setNewCatName('');
    } catch (err) {
      setNewCatError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setNewCatLoading(false);
    }
  };

  const F = formik; // alias for brevity

  const fieldErr = (name) => (F.touched[name] && F.errors[name] ? F.errors[name] : undefined);

  return (
    <>
      {/* ── Drawer header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-primary)',
          }}
        >
          {isEdit ? 'Edit Product' : 'Add Product'}
        </h2>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: 20,
            lineHeight: 1,
            padding: 4,
            borderRadius: 'var(--radius-md)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <CloseIcon style={{ fontSize: 20 }} />
        </button>
      </div>

      {/* ── Form body ── */}
      <form
        onSubmit={F.handleSubmit}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Image preview + upload */}
        <div>
          <label style={labelStyle}>Product Image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
            <div
              onClick={() => imageInputRef.current?.click()}
              style={{
                width: 72,
                height: 72,
                borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                flexShrink: 0,
                background: 'var(--color-surface-alt)',
                transition: 'border-color var(--transition-base)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              {F.values.image_url ? (
                <img
                  src={F.values.image_url}
                  alt='preview'
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <ImageIcon style={{ color: 'var(--color-text-muted)', fontSize: 28 }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input
                placeholder='https://example.com/image.jpg'
                value={F.values.image_url}
                onChange={(e) => F.setFieldValue('image_url', e.target.value)}
                helper='Paste an image URL or upload below'
              />
              <input
                ref={imageInputRef}
                type='file'
                accept='image/*'
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    F.setFieldValue('image_url', url);
                  }
                }}
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* Name */}
        <Input
          label='Product Name'
          required
          placeholder='e.g. HP LaserJet Toner Cartridge'
          {...F.getFieldProps('name')}
          error={fieldErr('name')}
        />

        {/* SKU + Barcode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            label='SKU'
            required
            disabled={isEdit}
            placeholder='e.g. PROD-001'
            {...F.getFieldProps('sku')}
            error={fieldErr('sku')}
            helper={isEdit ? 'SKU cannot be changed' : 'Unique product code'}
          />
          <Input
            label='Barcode'
            placeholder='EAN-13 / QR code'
            {...F.getFieldProps('barcode')}
            error={fieldErr('barcode')}
          />
        </div>

        {/* Category */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <label style={labelStyle}>
              Category <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <button
              type='button'
              onClick={() => setNewCatModal(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-primary)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
              }}
            >
              <AddCatIcon style={{ fontSize: 14 }} /> Add new
            </button>
          </div>
          <select
            style={{
              width: '100%',
              height: 38,
              padding: '0 36px 0 12px',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-surface)',
              border: `1px solid ${fieldErr('category') ? 'var(--color-danger)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
            {...F.getFieldProps('category')}
            onFocus={(e) => {
              e.target.style.borderColor = fieldErr('category')
                ? 'var(--color-danger)'
                : 'var(--color-primary)';
              e.target.style.boxShadow = fieldErr('category')
                ? '0 0 0 3px rgba(220,38,38,0.12)'
                : '0 0 0 3px rgba(37,99,235,0.12)';
            }}
            onBlur={(e) => {
              F.handleBlur(e);
              e.target.style.borderColor = fieldErr('category')
                ? 'var(--color-danger)'
                : 'var(--color-border)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <option value=''>Select category…</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErr('category') && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-danger)',
                display: 'block',
                marginTop: 4,
              }}
            >
              {fieldErr('category')}
            </span>
          )}
        </div>

        {/* Unit */}
        <Select label='Unit' required {...F.getFieldProps('unit')} error={fieldErr('unit')}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>

        {/* Prices */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            label='Selling Price (₹)'
            required
            type='number'
            step='0.01'
            min='0'
            placeholder='0.00'
            {...F.getFieldProps('unit_price')}
            error={fieldErr('unit_price')}
          />
          <Input
            label='Cost Price (₹)'
            type='number'
            step='0.01'
            min='0'
            placeholder='0.00'
            {...F.getFieldProps('cost_price')}
            error={fieldErr('cost_price')}
            helper='Purchase cost (optional)'
          />
        </div>

        {/* Reorder */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            label='Reorder Level'
            required
            type='number'
            min='0'
            placeholder='10'
            {...F.getFieldProps('reorder_level')}
            error={fieldErr('reorder_level')}
            helper='Alert threshold'
          />
          <Input
            label='Reorder Qty'
            type='number'
            min='0'
            placeholder='50'
            {...F.getFieldProps('reorder_qty')}
            error={fieldErr('reorder_qty')}
            helper='Auto-PO quantity'
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            rows={3}
            placeholder='Optional product description…'
            {...F.getFieldProps('description')}
            style={{
              width: '100%',
              padding: '9px 12px',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)';
              e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Status toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...labelStyle, margin: 0 }}>Active</label>
          <button
            type='button'
            role='switch'
            aria-checked={F.values.is_active}
            onClick={() => F.setFieldValue('is_active', !F.values.is_active)}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: 'none',
              background: F.values.is_active ? 'var(--color-success)' : 'var(--color-border)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background var(--transition-base)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: F.values.is_active ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left var(--transition-base)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {F.values.is_active
              ? 'Product is visible and orderable'
              : 'Product is hidden from catalogue'}
          </span>
        </div>

        {/* Global error */}
        {F.errors.name && F.submitCount > 0 && !F.touched.name && (
          <p
            style={{
              color: 'var(--color-danger)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-sans)',
              margin: 0,
            }}
          >
            {F.errors.name}
          </p>
        )}
      </form>

      {/* ── Footer actions ── */}
      <div
        style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexShrink: 0,
          background: 'var(--color-surface)',
        }}
      >
        <Button variant='ghost' size='sm' onClick={onCancel}>
          Cancel
        </Button>
        {!isEdit && (
          <Button
            variant='secondary'
            size='sm'
            loading={F.isSubmitting && addAnotherPending}
            onClick={() => {
              setAddAnotherPending(true);
              F.submitForm();
            }}
          >
            Save & Add Another
          </Button>
        )}
        <Button
          variant='primary'
          size='sm'
          loading={F.isSubmitting && !addAnotherPending}
          onClick={() => {
            setAddAnotherPending(false);
            F.submitForm();
          }}
        >
          {isEdit ? 'Update Product' : 'Save Product'}
        </Button>
      </div>

      {/* ── Add Category modal ── */}
      <Modal
        open={newCatModal}
        onClose={() => {
          setNewCatModal(false);
          setNewCatName('');
          setNewCatError('');
        }}
        title='Add New Category'
        size='sm'
      >
        <Modal.Body>
          <Input
            label='Category Name'
            required
            placeholder='e.g. Electronics, Stationery…'
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            error={newCatError}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setNewCatModal(false);
              setNewCatName('');
              setNewCatError('');
            }}
          >
            Cancel
          </Button>
          <Button variant='primary' size='sm' loading={newCatLoading} onClick={handleAddCategory}>
            Add Category
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

/* ── Micro helpers ────────────────────────────────────────────── */
const labelStyle = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-sans)',
  letterSpacing: '0.01em',
};

const Divider = () => (
  <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '2px 0' }} />
);
