import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  DeleteOutline as RemoveIcon,
  SaveOutlined as SaveIcon,
  SendOutlined as SubmitIcon,
  SearchOutlined as SearchIcon,
} from '@mui/icons-material';
import { purchaseOrderAPI, supplierAPI, warehouseAPI, productAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { fmt, fmtDate, parseItems, calcTotals } from './poHelpers';

/* ── tiny helpers ─────────────────────────────────────────────── */
const today = () => new Date().toISOString().split('T')[0];

/* ══════════════════════════════════════════════════════════════
   PurchaseOrderForm  — full page (Add + Edit)
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

  /* ── Form state ── */
  const [form, setForm] = useState({
    supplier_id:       '',
    warehouse_id:      '',
    expected_delivery: '',
    tax_percent:       0,
    notes:             '',
  });
  const [items, setItems] = useState([]);  // [{ product_id, product_name, sku, quantity, unit_cost, total_cost }]
  const [newItem, setNewItem] = useState({ product_id: '', quantity: 1, unit_cost: '' });
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});

  /* ── Load reference data ── */
  useEffect(() => {
    Promise.all([
      supplierAPI.getAll({ limit: 500, status: 'active' }),
      warehouseAPI.getAll(),
    ]).then(([s, w]) => {
      setSuppliers(s.data.data?.suppliers || s.data.data || []);
      setWarehouses(w.data.data || []);
      // Auto-select manager's warehouse
      if (!isAdmin && !form.warehouse_id) {
        const managed = (w.data.data || []).find((wh) => wh.manager_id === (user?.id || user?.user_id));
        if (managed) setForm((f) => ({ ...f, warehouse_id: managed.warehouse_id }));
      }
    }).catch(() => {});
  }, [isAdmin]);

  /* ── Load PO for edit ── */
  useEffect(() => {
    if (!isEdit) return;
    setPageLoading(true);
    purchaseOrderAPI.getById(id).then((res) => {
      const po = res.data.data;
      setForm({
        supplier_id:       po.supplier_id ?? '',
        warehouse_id:      po.warehouse_id ?? '',
        expected_delivery: po.expected_delivery ? po.expected_delivery.split('T')[0] : '',
        tax_percent:       po.tax_percent ?? 0,
        notes:             po.notes ?? '',
      });
      setItems(parseItems(po.items).map((i) => ({
        product_id:   i.product_id,
        product_name: i.product_name,
        sku:          i.sku || '',
        quantity:     Number(i.quantity) || 1,
        unit_cost:    Number(i.unit_cost || i.unit_price) || 0,
        total_cost:   Number(i.total_cost) || 0,
      })));
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

  /* ── Add line item ── */
  function addItem() {
    if (!newItem.product_id || !newItem.quantity || !newItem.unit_cost) {
      showToast('Select a product and fill Qty + Unit Cost', 'error');
      return;
    }
    const p = products.find((x) => String(x.product_id) === String(newItem.product_id));
    const qty  = Number(newItem.quantity);
    const cost = Number(newItem.unit_cost);
    setItems((prev) => [
      ...prev,
      {
        product_id:   Number(newItem.product_id),
        product_name: p?.name ?? '',
        sku:          p?.sku ?? '',
        quantity:     qty,
        unit_cost:    cost,
        total_cost:   qty * cost,
      },
    ]);
    setNewItem({ product_id: '', quantity: 1, unit_cost: '' });
  }

  function updateItemField(idx, field, val) {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      if (field === 'quantity' || field === 'unit_cost') {
        copy[idx].total_cost = Number(copy[idx].quantity) * Number(copy[idx].unit_cost);
      }
      return copy;
    });
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ── Totals ── */
  const { subtotal, taxAmount, grandTotal } = calcTotals(items, form.tax_percent);

  /* ── Validation ── */
  function validate() {
    const e = {};
    if (!form.supplier_id)  e.supplier_id  = 'Supplier is required';
    if (items.length === 0) e.items        = 'Add at least one line item';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Save ── */
  async function handleSave(andSubmit = false) {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        tax_percent: Number(form.tax_percent) || 0,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity:   i.quantity,
          unit_cost:  i.unit_cost,
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
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const tdStyle = {
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-border)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-primary)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => navigate('/purchase-orders')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)', padding: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
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
                value={form.supplier_id}
                onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                error={errors.supplier_id}
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}{s.rating > 0 ? ` ★${Number(s.rating).toFixed(1)}` : ''}{s.lead_time ? ` · ${s.lead_time}d` : ''}
                  </option>
                ))}
              </Select>
            </div>

            {/* Warehouse */}
            <div>
              <Select
                label="Destination Warehouse"
                value={form.warehouse_id}
                onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
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
              value={form.expected_delivery}
              onChange={(e) => setForm((f) => ({ ...f, expected_delivery: e.target.value }))}
            />

            {/* Tax */}
            <Input
              label="Tax (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.tax_percent}
              onChange={(e) => setForm((f) => ({ ...f, tax_percent: e.target.value }))}
              helper="Applied on subtotal"
            />
          </div>
        </Card.Body>
      </Card>

      {/* ── Line items ── */}
      <Card title="Line Items" action={errors.items && <Badge variant="danger" size="sm">{errors.items}</Badge>} padding={false}>
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
            <Input label="Qty" type="number" min="1" value={newItem.quantity} onChange={(e) => setNewItem((n) => ({ ...n, quantity: e.target.value }))} />
          </div>
          <div style={{ flex: '0 0 110px' }}>
            <Input label="Unit Cost (₹)" type="number" min="0" step="0.01" value={newItem.unit_cost} onChange={(e) => setNewItem((n) => ({ ...n, unit_cost: e.target.value }))} />
          </div>
          <Button variant="primary" size="sm" leftIcon={<AddIcon style={{ fontSize: 16 }} />} onClick={addItem} style={{ marginBottom: 1 }}>
            Add
          </Button>
        </div>

        {/* Items table */}
        {items.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>
            No items yet. Add products above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Product', 'SKU', 'Qty', 'Unit Cost', 'Total', ''].map((h) => (
                    <th key={h} style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{item.product_name}</span></td>
                    <td style={tdStyle}><code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', background: 'var(--color-surface-alt)', padding: '2px 6px', borderRadius: 4 }}>{item.sku}</code></td>
                    <td style={{ ...tdStyle, width: 80 }}>
                      <input
                        type="number" min="1" value={item.quantity}
                        onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))}
                        style={{ width: 64, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ ...tdStyle, width: 120 }}>
                      <input
                        type="number" min="0" step="0.01" value={item.unit_cost}
                        onChange={(e) => updateItemField(idx, 'unit_cost', Number(e.target.value))}
                        style={{ width: 100, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {fmt(item.total_cost)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => removeItem(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', padding: 4 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-danger-soft)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <RemoveIcon style={{ fontSize: 18 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals footer */}
        {items.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            padding: '14px 16px',
            borderTop: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
              <TotalRow label="Subtotal"  value={fmt(subtotal)} />
              <TotalRow label={`Tax (${form.tax_percent}%)`} value={fmt(taxAmount)} />
              <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 6, marginTop: 2 }}>
                <TotalRow label="Grand Total" value={fmt(grandTotal)} bold />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Notes ── */}
      <Card title="Notes">
        <Card.Body>
          <textarea
            rows={3}
            placeholder="Optional notes or instructions for the supplier…"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            style={{
              width: '100%', padding: '9px 12px',
              fontSize: 'var(--text-base)', fontFamily: 'var(--font-sans)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)';   e.target.style.boxShadow = 'none'; }}
          />
        </Card.Body>
      </Card>

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 24 }}>
        <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
        <Button variant="secondary" leftIcon={<SaveIcon style={{ fontSize: 16 }} />} loading={saving} onClick={() => handleSave(false)}>
          Save Draft
        </Button>
        <Button variant="primary" leftIcon={<SubmitIcon style={{ fontSize: 16 }} />} loading={saving} onClick={() => handleSave(true)}>
          Save & Submit
        </Button>
      </div>
    </div>
  );
}

function TotalRow({ label, value, bold = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, fontFamily: 'var(--font-sans)' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: bold ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? 'var(--text-lg)' : 'var(--text-sm)', fontFamily: 'var(--font-mono)', fontWeight: bold ? 800 : 600, color: bold ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{value}</span>
    </div>
  );
}
