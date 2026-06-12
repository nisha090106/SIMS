import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { inventoryAPI, productAPI, warehouseAPI } from '../../services/api';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

/**
 * StockOperationModal — shared for Stock In / Stock Out / Adjust
 * mode: 'stock-in' | 'stock-out' | 'adjust'
 */
export default function StockOperationModal({ mode, warehouses: propWH, isAdmin, userId, onClose, onSuccess }) {
  const [products, setProducts]     = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [myWarehouses, setMyWH]     = useState(propWH || []);
  const [selInvItems, setSelInv]    = useState([]); // for adjust — list of inventory items

  // Fetch products for selector
  useEffect(() => {
    productAPI.getAll({ limit: 200, search: prodSearch || undefined })
      .then((r) => setProducts(r.data.data?.products || []))
      .catch(() => {});
  }, [prodSearch]);

  // Fetch own warehouses if not admin
  useEffect(() => {
    if (!isAdmin && propWH.length === 0) {
      warehouseAPI.getAll().then((r) => setMyWH(r.data.data || [])).catch(() => {});
    }
  }, [isAdmin, propWH]);

  const TITLES = { 'stock-in': 'Stock In — Receive Goods', 'stock-out': 'Stock Out — Issue Goods', adjust: 'Adjust Stock' };

  /* ── Schemas ── */
  const schemas = {
    'stock-in': Yup.object({
      product_id:   Yup.number().required('Product is required'),
      warehouse_id: Yup.number().required('Warehouse is required'),
      quantity:     Yup.number().positive('Must be > 0').required('Quantity is required'),
      batch_no:     Yup.string().nullable(),
      expiry_date:  Yup.date().nullable(),
      location:     Yup.string().nullable(),
      notes:        Yup.string().nullable(),
    }),
    'stock-out': Yup.object({
      product_id:   Yup.number().required('Product is required'),
      warehouse_id: Yup.number().required('Warehouse is required'),
      quantity:     Yup.number().positive('Must be > 0').required('Quantity is required'),
      reason:       Yup.string().required('Reason is required'),
      reference_no: Yup.string().nullable(),
    }),
    adjust: Yup.object({
      inventory_id: Yup.number().required('Select an inventory item'),
      new_qty:      Yup.number().min(0, 'Must be ≥ 0').required('New quantity is required'),
      reason:       Yup.string().required('Reason is required for audit trail'),
      notes:        Yup.string().nullable(),
    }),
  };

  const initials = {
    'stock-in':  { product_id: '', warehouse_id: '', quantity: '', batch_no: '', expiry_date: '', location: '', notes: '' },
    'stock-out': { product_id: '', warehouse_id: '', quantity: '', reason: '', reference_no: '' },
    adjust:      { inventory_id: '', new_qty: '', reason: '', notes: '' },
  };

  const formik = useFormik({
    initialValues: initials[mode],
    validationSchema: schemas[mode],
    onSubmit: async (values, helpers) => {
      try {
        let msg = '';
        if (mode === 'stock-in') {
          await inventoryAPI.stockIn(values);
          msg = 'Stock received successfully';
        } else if (mode === 'stock-out') {
          await inventoryAPI.stockOut(values);
          msg = 'Stock issued successfully';
        } else {
          await inventoryAPI.adjust(values);
          msg = 'Stock adjusted successfully';
        }
        onSuccess(msg);
      } catch (err) {
        const e = err.response?.data?.error || 'Operation failed';
        helpers.setFieldError('quantity', e);
        helpers.setFieldError('reason', e);
      }
    },
  });

  const F   = formik;
  const err = (n) => F.touched[n] && F.errors[n] ? F.errors[n] : undefined;

  // Load inventory items for adjust mode when warehouse+product selected
  useEffect(() => {
    if (mode !== 'adjust') return;
    inventoryAPI.getAll({ limit: 200 })
      .then((r) => setSelInv(r.data.data?.inventory || []))
      .catch(() => {});
  }, [mode]);

  return (
    <Modal open title={TITLES[mode]} onClose={onClose} size="md">
      <Modal.Body>
        <form id="op-form" onSubmit={F.handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Stock In & Out: product selector ── */}
            {mode !== 'adjust' && (
              <>
                <div>
                  <Input
                    label="Search Product"
                    placeholder="Type to search…"
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                  />
                </div>
                <Select label="Product" required value={F.values.product_id} onChange={(e) => F.setFieldValue('product_id', e.target.value)} error={err('product_id')}>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>{p.name} — {p.sku}</option>
                  ))}
                </Select>

                <Select label="Warehouse" required value={F.values.warehouse_id} onChange={(e) => F.setFieldValue('warehouse_id', e.target.value)} error={err('warehouse_id')} disabled={!isAdmin && myWarehouses.length === 1}>
                  <option value="">Select warehouse…</option>
                  {myWarehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
                </Select>

                <Input label="Quantity" required type="number" min="1" {...F.getFieldProps('quantity')} error={err('quantity')} />
              </>
            )}

            {/* ── Stock In extras ── */}
            {mode === 'stock-in' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Input label="Batch Number" placeholder="BATCH-001" {...F.getFieldProps('batch_no')} error={err('batch_no')} />
                  <Input label="Expiry Date" type="date" {...F.getFieldProps('expiry_date')} error={err('expiry_date')} />
                </div>
                <Input label="Storage Location" placeholder="Rack A1, Zone B…" {...F.getFieldProps('location')} />
                <Input label="Notes" placeholder="Optional notes…" {...F.getFieldProps('notes')} />
              </>
            )}

            {/* ── Stock Out extras ── */}
            {mode === 'stock-out' && (
              <>
                <Input label="Reason" required placeholder="Sales / Damage / Internal use…" {...F.getFieldProps('reason')} error={err('reason')} />
                <Input label="Reference #" placeholder="Sales order / Request # (optional)" {...F.getFieldProps('reference_no')} />
              </>
            )}

            {/* ── Adjust mode ── */}
            {mode === 'adjust' && (
              <>
                <Select label="Inventory Item" required value={F.values.inventory_id} onChange={(e) => F.setFieldValue('inventory_id', e.target.value)} error={err('inventory_id')}>
                  <option value="">Select item to adjust…</option>
                  {selInvItems.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.product_name} ({r.sku}) — {r.warehouse_name} — Qty: {r.quantity}
                    </option>
                  ))}
                </Select>
                <Input label="New Quantity" required type="number" min="0" {...F.getFieldProps('new_qty')} error={err('new_qty')} helper="Set the corrected total quantity (not a delta)" />
                <Input label="Reason" required placeholder="Physical count / Damage / System error…" {...F.getFieldProps('reason')} error={err('reason')} />
                <Input label="Notes" placeholder="Optional notes…" {...F.getFieldProps('notes')} />
              </>
            )}
          </div>
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant={mode === 'stock-out' ? 'danger' : 'primary'}
          size="sm"
          loading={F.isSubmitting}
          onClick={F.submitForm}
        >
          {mode === 'stock-in' ? 'Receive Stock' : mode === 'stock-out' ? 'Issue Stock' : 'Apply Adjustment'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
