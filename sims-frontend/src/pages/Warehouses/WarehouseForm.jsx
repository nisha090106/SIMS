import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Close as CloseIcon } from '@mui/icons-material';
import { warehouseAPI } from '../../services/api';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const schema = Yup.object({
  name:       Yup.string().min(2).required('Name is required'),
  code:       Yup.string().max(20).nullable(),
  location:   Yup.string().min(2).required('Location is required'),
  city:       Yup.string().max(80).nullable(),
  country:    Yup.string().max(60).nullable(),
  address:    Yup.string().nullable(),
  capacity:   Yup.number().positive('Must be > 0').required('Capacity is required'),
  manager_id: Yup.number().integer().required('Manager is required'),
  status:     Yup.string().oneOf(['active', 'inactive']).required(),
});

export default function WarehouseForm({ warehouse, onSuccess, onCancel }) {
  const isEdit = Boolean(warehouse);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    warehouseAPI.getManagers()
      .then((r) => setManagers(r.data.data || []))
      .catch(() => {});
  }, []);

  const formik = useFormik({
    initialValues: {
      name:       warehouse?.name       ?? '',
      code:       warehouse?.code       ?? '',
      location:   warehouse?.location   ?? '',
      city:       warehouse?.city       ?? '',
      country:    warehouse?.country    ?? 'India',
      address:    warehouse?.address    ?? '',
      capacity:   warehouse?.capacity   ?? '',
      manager_id: warehouse?.manager_id ?? '',
      status:     warehouse?.status     ?? 'active',
    },
    validationSchema: schema,
    enableReinitialize: true,
    onSubmit: async (values, helpers) => {
      try {
        const payload = {
          ...values,
          code: values.code ? values.code.toUpperCase() : null,
          city:    values.city    || null,
          country: values.country || null,
          address: values.address || null,
        };
        if (isEdit) {
          await warehouseAPI.update(warehouse.warehouse_id, payload);
          onSuccess('Warehouse updated successfully');
        } else {
          await warehouseAPI.create(payload);
          onSuccess('Warehouse created successfully');
        }
      } catch (err) {
        const e = err.response?.data?.error || 'Save failed';
        helpers.setFieldError('name', e);
      }
    },
  });

  const F   = formik;
  const err = (n) => F.touched[n] && F.errors[n] ? F.errors[n] : undefined;

  return (
    <>
      {/* Drawer header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
          {isEdit ? 'Edit Warehouse' : 'Add Warehouse'}
        </h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
          <CloseIcon style={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input label="Warehouse Name" required placeholder="e.g. Main Warehouse" {...F.getFieldProps('name')} error={err('name')} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Code" placeholder="WH-MUM (auto-uppercase)" value={F.values.code} onChange={(e) => F.setFieldValue('code', e.target.value.toUpperCase())} onBlur={F.handleBlur} name="code" error={err('code')} helper="Short unique code" />
          <Select label="Status" required {...F.getFieldProps('status')} error={err('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Location / Zone" required placeholder="Building A" {...F.getFieldProps('location')} error={err('location')} />
          <Input label="City" placeholder="Mumbai" {...F.getFieldProps('city')} error={err('city')} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Country" placeholder="India" {...F.getFieldProps('country')} />
          <Input label="Capacity (units)" required type="number" min="1" placeholder="10000" {...F.getFieldProps('capacity')} error={err('capacity')} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
            Full Address
          </label>
          <textarea rows={3} placeholder="Street, area, pin code…" {...F.getFieldProps('address')}
            style={{ width: '100%', padding: '9px 12px', fontSize: 'var(--text-base)', fontFamily: 'var(--font-sans)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <Select label="Manager" required value={F.values.manager_id} onChange={(e) => F.setFieldValue('manager_id', e.target.value)} error={err('manager_id')}>
          <option value="">Select manager…</option>
          {managers.map((m) => <option key={m.id || m.user_id} value={m.id || m.user_id}>{m.full_name} ({m.role})</option>)}
        </Select>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" loading={F.isSubmitting} onClick={F.submitForm}>
          {isEdit ? 'Update Warehouse' : 'Create Warehouse'}
        </Button>
      </div>
    </>
  );
}
