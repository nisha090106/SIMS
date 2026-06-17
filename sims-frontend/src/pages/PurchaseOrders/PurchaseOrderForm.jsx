import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  DeleteOutline as RemoveIcon,
  SaveOutlined as SaveIcon,
  SendOutlined as SubmitIcon,
  SearchOutlined as SearchIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { purchaseOrderAPI, supplierAPI, warehouseAPI, productAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { fmt, parseItems, calcTotals } from './poHelpers';

/* ── Yup schema ──────────────────────────────────────────────── */
const POSchema = Yup.object().shape({
  supplier_id:       Yup.number().required('Supplier is required').positive('Select a supplier'),
  warehouse_id:      Yup.mixed().nullable(),
  expected_delivery: Yup.string().nullable(),
  tax_percent:       Yup.number().min(0, 'Min 0%').max(100, 'Max 100%').default(0),
  notes:             Yup.string().nullable(),
  items: Yup.array()
    .of(
      Yup.object().shape({
        product_id:   Yup.number().required('Product is required'),
        product_name: Yup.string(),
        sku:          Yup.string(),
        quantity:     Yup.number().required('Qty required').min(1, 'Min 1'),
        unit_cost:    Yup.number().required('Cost required').min(0, 'Min 0'),
        total_cost:   Yup.number(),
      }),
    )
    .min(1, 'Add at least one line item'),
});

/* ── tiny helpers ─────────────────────────────────────────────── */
const today = () => new Date().toISOString().split('T')[0];

/* ── Styles ───────────────────────────────────────────────────── */
const tdStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-border)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
  color: 'var(--color-text-primary)',
  verticalAlign: 'middle',
};

const thStyle = {
  ...tdStyle,
  background: 'var(--color-surface-alt)',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inlineInputStyle = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  textAlign: 'right',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const errorTextStyle = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-danger)',
  fontFamily: 'var(--font-sans)',
  marginTop: 3,
};

/* ══════════════════════════════════════════════════════════════
   PurchaseOrderForm  — Formik + Yup (Add + Edit)
══════════════════════════════════════════════════════════════ */
export default function PurchaseOrderForm() {
  const { id }    = useParams();           // undefined = new
  const navigate  = useNavigate();
  const { showToast } = useToast();
  const { user }  = useSelector((s) => s.auth);
  const isAdmin   = user?.role === 'admin';
  const isEdit    = Boolean(id);

  /* ── Loading state ── */
  const [pageLoading, setPageLoading] = useState(isEdit);

  /* ── Reference data ── */
  const [suppliers, setSuppliers]   = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts]     = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const debRef = useRef(null);

  /* ── Add-item row state (not part of Formik) ── */
  const [newItem, setNewItem] = useState({ product_id: '', quantity: 1, unit_cost: '' });

  /* ── Existing PO data (for edit mode) ── */
  const [existingPO, setExistingPO] = useState(null);

  /* ── Load reference data ── */
  useEffect(() => {
    Promise.all([
      supplierAPI.getAll({ limit: 500, status: 'active' }),
      warehouseAPI.getAll(),
    ]).then(([s, w]) => {
      setSuppliers(s.data.data?.suppliers || s.data.data || []);
      setWarehouses(w.data.data || []);
    }).catch(() => {});
  }, []);

  /* ── Load PO for edit ── */
  useEffect(() => {
    if (!isEdit) return;
    setPageLoading(true);
    purchaseOrderAPI.getById(id).then((res) => {
      const po = res.data.data;
      setExistingPO(po);
    }).catch(() => showToast('Failed to load PO', 'error'))
      .finally(() => setPageLoading(false));
  }, [id, isEdit]);

  /* ── Debounced product search ── */
  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      productAPI.getAll({ limit: 100, search: prodSearch || undefined })
        .then((r) => setProducts(r.data.data?.products || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(debRef.current);
  }, [prodSearch]);

  /* ── Auto-fill unit cost when product selected ── */
  function handleNewItemProduct(productId) {
    const p = products.find((x) => String(x.product_id) === String(productId));
    setNewItem((prev) => ({
      ...prev,
      product_id: productId,
      unit_cost: p ? (Number(p.cost_price) || Number(p.unit_price) || '') : '',
    }));
  }

  /* ── Build initial values (new or edit) ── */
  function buildInitialValues() {
    if (isEdit && existingPO) {
      const parsedItems = parseItems(existingPO.items).map((i) => ({
        product_id:   i.product_id,
        product_name: i.product_name,
        sku:          i.sku || '',
        quantity:     Number(i.quantity) || 1,
        unit_cost:    Number(i.unit_cost || i.unit_price) || 0,
        total_cost:   Number(i.total_cost) || 0,
      }));
      return {
        supplier_id:       existingPO.supplier_id ?? '',
        warehouse_id:      existingPO.warehouse_id ?? '',
        expected_delivery: existingPO.expected_delivery ? existingPO.expected_delivery.split('T')[0] : '',
        tax_percent:       existingPO.tax_percent ?? 0,
        notes:             existingPO.notes ?? '',
        items:             parsedItems,
      };
    }

    // New PO — auto-assign warehouse for manager
    let defaultWH = '';
    if (!isAdmin && warehouses.length > 0) {
      const managed = warehouses.find((wh) => wh.manager_id === (user?.id || user?.user_id));
      if (managed) defaultWH = managed.warehouse_id;
    }

    return {
      supplier_id:       '',
      warehouse_id:      defaultWH,
      expected_delivery: '',
      tax_percent:       0,
      notes:             '',
      items:             [],
    };
  }

  /* ── Save ── */
  async function handleSave(values, andSubmit = false) {
    try {
      const payload = {
        supplier_id:       Number(values.supplier_id),
        warehouse_id:      values.warehouse_id ? Number(values.warehouse_id) : undefined,
        expected_delivery: values.expected_delivery || undefined,
        tax_percent:       Number(values.tax_percent) || 0,
        notes:             values.notes || undefined,
        items: values.items.map((i) => ({
          product_id: i.product_id,
          quantity:   Number(i.quantity),
          unit_cost:  Number(i.unit_cost),
        })),
      };

      let po;
      if (isEdit) {
        const res = await purchaseOrderAPI.update(id, payload);
        po = res.data.data;
        showToast('Purchase order updated', 'success');
      } else {
        const res = await purchaseOrderAPI.create(payload);
        po = res.data.data;
        showToast('Purchase order created as draft', 'success');
      }

      if (andSubmit && po?.po_id) {
        await purchaseOrderAPI.submit(po.po_id);
        showToast('PO submitted for approval', 'success');
      }

      navigate(`/purchase-orders/${po?.po_id}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    }
  }

  if (pageLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEdit && !existingPO) {
    return (
      <div style={{ textAlign: 'center', padding: 48, fontFamily: 'var(--font-sans)' }}>
        <h2 style={{ color: 'var(--color-text-primary)' }}>PO not found</h2>
        <Button variant="secondary" onClick={() => navigate('/purchase-orders')}>
          <BackIcon style={{ fontSize: 16 }} /> Back
        </Button>
      </div>
    );
  }

  return (
    <Formik
      initialValues={buildInitialValues()}
      validationSchema={POSchema}
      enableReinitialize
      onSubmit={(values, { setSubmitting }) => {
        handleSave(values, false).finally(() => setSubmitting(false));
      }}
    >
      {({ values, errors, touched, setFieldValue, isSubmitting, validateForm, setTouched }) => {
        const { subtotal, taxAmount, grandTotal } = calcTotals(values.items, values.tax_percent);

        /* ── Add line item from the add-row ── */
        function addItem(push) {
          if (!newItem.product_id || !newItem.quantity || !newItem.unit_cost) {
            showToast('Select a product and fill Qty + Unit Cost', 'error');
            return;
          }
          const p = products.find((x) => String(x.product_id) === String(newItem.product_id));
          const qty  = Number(newItem.quantity);
          const cost = Number(newItem.unit_cost);
          push({
            product_id:   Number(newItem.product_id),
            product_name: p?.name ?? '',
            sku:          p?.sku ?? '',
            quantity:     qty,
            unit_cost:    cost,
            total_cost:   qty * cost,
          });
          setNewItem({ product_id: '', quantity: 1, unit_cost: '' });
        }

        /* ── Save & Submit handler ── */
        async function handleSaveAndSubmit() {
          const formErrors = await validateForm();
          if (Object.keys(formErrors).length > 0) {
            // Touch all fields so errors show
            setTouched({
              supplier_id: true,
              items: true,
            });
            showToast('Please fix validation errors', 'error');
            return;
          }
          await handleSave(values, true);
        }

        return (
          <Form style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000, margin: '0 auto' }}>

            {/* ── Breadcrumb ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => navigate('/purchase-orders')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)', padding: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              >
                <BackIcon style={{ fontSize: 16 }} /> Purchase Orders
              </button>
              <span style={{ color: 'var(--color-text-muted)' }}>/</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
                {isEdit ? `Edit PO` : 'New Purchase Order'}
              </span>
            </div>

            {/* ── Header card ── */}
            <Card title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'} subtitle="Fill in the details below. Save as draft or submit directly for approval.">
              <Card.Body>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Supplier */}
                  <div>
                    <Select
                      label="Supplier"
                      required
                      value={values.supplier_id}
                      onChange={(e) => setFieldValue('supplier_id', e.target.value)}
                      error={touched.supplier_id && errors.supplier_id}
                    >
                      <option value="">Select supplier…</option>
                      {suppliers.map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.name}{s.rating > 0 ? ` ★${Number(s.rating).toFixed(1)}` : ''}{s.lead_time ? ` · ${s.lead_time}d` : ''}
                        </option>
                      ))}
                    </Select>
                    {touched.supplier_id && errors.supplier_id && (
                      <p style={errorTextStyle}>{errors.supplier_id}</p>
                    )}
                  </div>

                  {/* Warehouse */}
                  <div>
                    <Select
                      label="Destination Warehouse"
                      value={values.warehouse_id}
                      onChange={(e) => setFieldValue('warehouse_id', e.target.value)}
                      disabled={!isAdmin}
                    >
                      <option value="">Select warehouse…</option>
                      {warehouses.map((w) => (
                        <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
                      ))}
                    </Select>
                    {!isAdmin && <p style={{ margin: '3px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>Auto-assigned to your warehouse</p>}
                  </div>

                  {/* Expected delivery */}
                  <Input
                    label="Expected Delivery"
                    type="date"
                    min={today()}
                    value={values.expected_delivery}
                    onChange={(e) => setFieldValue('expected_delivery', e.target.value)}
                  />

                  {/* Tax */}
                  <div>
                    <Input
                      label="Tax (%)"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={values.tax_percent}
                      onChange={(e) => setFieldValue('tax_percent', e.target.value)}
                      helper="Applied on subtotal"
                    />
                    {touched.tax_percent && errors.tax_percent && (
                      <p style={errorTextStyle}>{errors.tax_percent}</p>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* ── Line items (FieldArray) ── */}
            <FieldArray name="items">
              {({ push, remove }) => (
                <Card
                  title="Line Items"
                  action={
                    typeof errors.items === 'string' && touched.items
                      ? <Badge variant="danger" size="sm">{errors.items}</Badge>
                      : null
                  }
                  padding={false}
                >
                  {/* Add-item row */}
                  <div style={{ display: 'flex', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {/* Product search */}
                    <div style={{ flex: '2 1 200px' }}>
                      <Input
                        label="Search product"
                        placeholder="Type name or SKU…"
                        value={prodSearch}
                        onChange={(e) => setProdSearch(e.target.value)}
                        leftIcon={<SearchIcon style={{ fontSize: 15 }} />}
                      />
                    </div>
                    <div style={{ flex: '2 1 180px' }}>
                      <Select
                        label="Product"
                        value={newItem.product_id}
                        onChange={(e) => handleNewItemProduct(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {products.map((p) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.name} — {p.sku}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div style={{ flex: '0 0 80px' }}>
                      <Input
                        label="Qty"
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem((n) => ({ ...n, quantity: e.target.value }))}
                      />
                    </div>
                    <div style={{ flex: '0 0 110px' }}>
                      <Input
                        label="Unit Cost (₹)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.unit_cost}
                        onChange={(e) => setNewItem((n) => ({ ...n, unit_cost: e.target.value }))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      leftIcon={<AddIcon style={{ fontSize: 16 }} />}
                      onClick={() => addItem(push)}
                      style={{ marginBottom: 1 }}
                    >
                      Add
                    </Button>
                  </div>

                  {/* Items table */}
                  {values.items.length === 0 ? (
                    <div style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                    }}>
                      <InfoIcon style={{ fontSize: 32, color: 'var(--color-border)', display: 'block', margin: '0 auto 8px' }} />
                      No items yet. Search and add products above.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['#', 'Product', 'SKU', 'Qty', 'Unit Cost (₹)', 'Total', ''].map((h) => (
                              <th key={h} style={thStyle}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {values.items.map((item, idx) => {
                            const itemErrors = errors.items?.[idx] || {};
                            const itemTouched = touched.items?.[idx] || {};
                            return (
                              <tr key={idx} style={{ transition: 'background 0.15s' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                              >
                                {/* Row number */}
                                <td style={{ ...tdStyle, color: 'var(--color-text-muted)', width: 40, textAlign: 'center' }}>
                                  {idx + 1}
                                </td>

                                {/* Product name */}
                                <td style={tdStyle}>
                                  <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                                </td>

                                {/* SKU */}
                                <td style={tdStyle}>
                                  <code style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--text-xs)',
                                    background: 'var(--color-surface-alt)',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                  }}>
                                    {item.sku}
                                  </code>
                                </td>

                                {/* Qty — editable */}
                                <td style={{ ...tdStyle, width: 90 }}>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const qty = Number(e.target.value) || 0;
                                      setFieldValue(`items.${idx}.quantity`, qty);
                                      setFieldValue(`items.${idx}.total_cost`, qty * Number(item.unit_cost));
                                    }}
                                    style={{ ...inlineInputStyle, width: 70, textAlign: 'center' }}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                                  />
                                  {itemTouched.quantity && itemErrors.quantity && (
                                    <p style={errorTextStyle}>{itemErrors.quantity}</p>
                                  )}
                                </td>

                                {/* Unit cost — editable */}
                                <td style={{ ...tdStyle, width: 130 }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unit_cost}
                                    onChange={(e) => {
                                      const cost = Number(e.target.value) || 0;
                                      setFieldValue(`items.${idx}.unit_cost`, cost);
                                      setFieldValue(`items.${idx}.total_cost`, Number(item.quantity) * cost);
                                    }}
                                    style={{ ...inlineInputStyle, width: 110 }}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                                  />
                                  {itemTouched.unit_cost && itemErrors.unit_cost && (
                                    <p style={errorTextStyle}>{itemErrors.unit_cost}</p>
                                  )}
                                </td>

                                {/* Total (computed) */}
                                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                  {fmt(Number(item.quantity) * Number(item.unit_cost))}
                                </td>

                                {/* Remove */}
                                <td style={{ ...tdStyle, textAlign: 'right', width: 44 }}>
                                  <button
                                    type="button"
                                    onClick={() => remove(idx)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--color-danger)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: 4,
                                      borderRadius: 'var(--radius-md)',
                                      transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-danger-soft)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                                    title="Remove item"
                                  >
                                    <RemoveIcon style={{ fontSize: 18 }} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Totals footer */}
                  {values.items.length > 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'flex-end',
                      padding: '14px 16px',
                      borderTop: '1px solid var(--color-border)',
                      background: 'linear-gradient(180deg, var(--color-surface-alt), transparent)',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                        <TotalRow label="Subtotal" value={fmt(subtotal)} />
                        <TotalRow label={`Tax (${values.tax_percent}%)`} value={fmt(taxAmount)} />
                        <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 6, marginTop: 2 }}>
                          <TotalRow label="Grand Total" value={fmt(grandTotal)} bold />
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </FieldArray>

            {/* ── Notes ── */}
            <Card title="Notes">
              <Card.Body>
                <textarea
                  rows={3}
                  placeholder="Optional notes or instructions for the supplier…"
                  value={values.notes}
                  onChange={(e) => setFieldValue('notes', e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px',
                    fontSize: 'var(--text-base)', fontFamily: 'var(--font-sans)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)';   e.target.style.boxShadow = 'none'; }}
                />
              </Card.Body>
            </Card>

            {/* ── Action buttons ── */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 24 }}>
              <Button type="button" variant="ghost" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
              <Button
                type="submit"
                variant="secondary"
                leftIcon={<SaveIcon style={{ fontSize: 16 }} />}
                loading={isSubmitting}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                leftIcon={<SubmitIcon style={{ fontSize: 16 }} />}
                loading={isSubmitting}
                onClick={handleSaveAndSubmit}
              >
                Save &amp; Submit
              </Button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}

/* ── TotalRow helper ───────────────────────────────────────────── */
function TotalRow({ label, value, bold = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, fontFamily: 'var(--font-sans)' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: bold ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? 'var(--text-lg)' : 'var(--text-sm)', fontFamily: 'var(--font-mono)', fontWeight: bold ? 800 : 600, color: bold ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{value}</span>
    </div>
  );
}
