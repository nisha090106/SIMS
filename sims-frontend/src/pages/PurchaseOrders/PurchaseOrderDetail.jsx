import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowBack as BackIcon,
  EditOutlined as EditIcon,
  SendOutlined as SubmitIcon,
  CheckCircleOutline as ApproveIcon,
  LocalShippingOutlined as ShipIcon,
  InventoryOutlined as ReceiveIcon,
  CancelOutlined as CancelIcon,
  WarningAmberOutlined as WarnIcon,
  AutoAwesome as AutoIcon,
  PersonOutline as PersonIcon,
  CalendarToday as DateIcon,
  StorefrontOutlined as SupplierIcon,
  Warehouse as WHIcon,
} from '@mui/icons-material';
import { purchaseOrderAPI, warehouseAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import {
  STATUS_CONFIG, STATUS_ORDER, fmt, fmtDate, parseItems, calcTotals, userName,
} from './poHelpers';

/* ── Reducer ─────────────────────────────────────────────────── */
const INIT = { po: null, loading: true, error: null };
function reducer(s, a) {
  switch (a.type) {
    case 'START':  return { ...s, loading: true,  error: null };
    case 'OK':     return { loading: false, error: null, po: a.po };
    case 'ERROR':  return { ...s, loading: false, error: a.error };
    default:       return s;
  }
}

/* ── Status Timeline ─────────────────────────────────────────── */
function StatusStepper({ status }) {
  const steps = ['draft', 'pending', 'confirmed', 'delivered'];
  
  let activeIdx = 0;
  if (status === 'submitted') activeIdx = 1;
  else if (status === 'approved' || status === 'shipped') activeIdx = 2;
  else if (status === 'received') activeIdx = 3;

  const isCancelled = status === 'cancelled';

  const stepLabels = {
    draft: { label: 'Draft', color: '#64748B' },
    pending: { label: 'Pending', color: '#0891B2' },
    confirmed: { label: 'Confirmed', color: '#2563EB' },
    delivered: { label: 'Delivered', color: '#16A34A' },
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
      {steps.map((step, i) => {
        const cfg  = stepLabels[step];
        const done = isCancelled ? false : i <= activeIdx;
        const curr = !isCancelled && i === activeIdx;

        return (
          <React.Fragment key={step}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done ? cfg.color : 'var(--color-surface-alt)',
                border: `2px solid ${done ? cfg.color : 'var(--color-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                color: done ? '#fff' : 'var(--color-text-muted)',
                boxShadow: curr ? `0 0 0 4px ${cfg.color}30` : 'none',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                marginTop: 4, fontSize: 10, fontWeight: curr ? 700 : 400,
                color: done ? cfg.color : 'var(--color-text-muted)',
                fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}>
                {cfg.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, minWidth: 20,
                background: i < activeIdx && !isCancelled ? stepLabels[steps[i + 1]]?.color || 'var(--color-border)' : 'var(--color-border)',
                margin: '0 2px', marginBottom: 18,
              }} />
            )}
          </React.Fragment>
        );
      })}
      {isCancelled && (
        <Badge variant="danger" size="sm" dot style={{ marginLeft: 12 }}>Cancelled</Badge>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PurchaseOrderDetail
══════════════════════════════════════════════════════════════ */
export default function PurchaseOrderDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { showToast } = useToast();
  const { user }  = useSelector((s) => s.auth);
  const isAdmin   = user?.role === 'admin';
  const isMgr     = user?.role === 'manager';
  const canManage = isAdmin || isMgr;

  const [state, dispatch] = useReducer(reducer, INIT);
  const [warehouses, setWarehouses] = useState([]);
  const [actionLoading, setActionLoading] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [cancelOpen, setCancelOpen]     = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [receiveOpen, setReceiveOpen]   = useState(false);

  /* ── Receiving modal state ── */
  const [receiveWH, setReceiveWH] = useState('');
  const [receiveItems, setReceiveItems] = useState([]);
  const [receiving, setReceiving] = useState(false);

  const fetchPO = useCallback(async () => {
    dispatch({ type: 'START' });
    try {
      const res = await purchaseOrderAPI.getById(id);
      dispatch({ type: 'OK', po: res.data.data });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err.response?.data?.error || 'Failed to load PO' });
      showToast(err.response?.data?.error || 'Failed to load PO', 'error');
    }
  }, [id, showToast]);

  useEffect(() => { fetchPO(); }, [fetchPO]);

  useEffect(() => {
    warehouseAPI.getAll().then((r) => setWarehouses(r.data.data || [])).catch(() => {});
  }, []);

  /* ── Lifecycle actions ── */
  async function doAction(action) {
    setActionLoading(action);
    try {
      await purchaseOrderAPI[action](id);
      showToast(`PO ${action}d successfully`, 'success');
      fetchPO();
    } catch (err) {
      showToast(err.response?.data?.error || `Action failed`, 'error');
    } finally {
      setActionLoading('');
    }
  }

  async function doApprove() {
    setActionLoading('approve');
    try {
      if (po.status === 'draft') {
        await purchaseOrderAPI.submit(id);
      }
      await purchaseOrderAPI.approve(id);
      showToast('PO approved successfully', 'success');
      fetchPO();
    } catch (err) {
      showToast(err.response?.data?.error || 'Approve failed', 'error');
    } finally {
      setActionLoading('');
    }
  }

  async function doCancel() {
    setActionLoading('cancel');
    try {
      await purchaseOrderAPI.cancel(id, { reason: cancelReason });
      showToast('PO cancelled successfully', 'success');
      fetchPO();
    } catch (err) {
      showToast(err.response?.data?.error || 'Cancel failed', 'error');
    } finally {
      setActionLoading('');
    }
  }

  /* ── Open receive modal ── */
  function openReceive() {
    const items = parseItems(state.po?.items).map((i) => ({
      product_id:       i.product_id,
      product_name:     i.product_name,
      sku:              i.sku,
      ordered_qty:      i.quantity,
      quantity_received: i.quantity,  // default to full qty
      batch_no:         '',
      expiry_date:      '',
    }));
    setReceiveItems(items);
    setReceiveWH(state.po?.warehouse_id || '');
    setReceiveOpen(true);
  }

  async function confirmReceive() {
    if (!receiveWH) { showToast('Select a destination warehouse', 'error'); return; }
    setReceiving(true);
    try {
      await purchaseOrderAPI.receive(id, {
        warehouse_id:   receiveWH,
        received_items: receiveItems.map((i) => ({
          product_id:        i.product_id,
          quantity_received: Number(i.quantity_received) || 0,
          batch_no:          i.batch_no  || undefined,
          expiry_date:       i.expiry_date || undefined,
        })),
      });
      showToast('Goods received and stock updated', 'success');
      setReceiveOpen(false);
      fetchPO();
    } catch (err) {
      showToast(err.response?.data?.error || 'Receive failed', 'error');
    } finally {
      setReceiving(false);
    }
  }

  /* ── Loading / error states ── */
  const { po, loading, error } = state;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Spinner size="lg" />
    </div>
  );

  if (error || !po) return (
    <div style={{ textAlign: 'center', padding: 48, fontFamily: 'var(--font-sans)' }}>
      <WarnIcon style={{ fontSize: 48, color: 'var(--color-warning)', marginBottom: 12 }} />
      <h2 style={{ margin: '0 0 8px', color: 'var(--color-text-primary)' }}>PO not found</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{error}</p>
      <Button variant="secondary" onClick={() => navigate('/purchase-orders')}>
        <BackIcon style={{ fontSize: 16 }} /> Back
      </Button>
    </div>
  );

  const items  = parseItems(po.items);
  const { subtotal, taxAmount, grandTotal } = calcTotals(items, po.tax_percent);
  const cfg    = STATUS_CONFIG[po.status] || STATUS_CONFIG.draft;
  const status = po.status;

  const tdStyle = {
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-border)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-primary)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => navigate('/purchase-orders')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)', padding: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
          <BackIcon style={{ fontSize: 16 }} /> Purchase Orders
        </button>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>{po.po_number}</span>
      </div>

      {/* ── PO Header ── */}
      <Card>
        <Card.Body>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {po.po_number}
                </h1>
                <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                {po.auto_drafted && (
                  <Badge variant="warning" size="sm"><AutoIcon style={{ fontSize: 11 }} /> Auto-drafted</Badge>
                )}
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px 16px', marginTop: 16, marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>Supplier</span>
                  {po.supplier ? (
                    <Link to={`/suppliers/${po.supplier_id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'var(--font-sans)', fontSize: 13, textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}>
                      {po.supplier.name}
                    </Link>
                  ) : '—'}
                </div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>Created By</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                    {userName(po.created_by_user)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>Created Date</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                    {fmtDate(po.created_at)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>Total Amount</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {fmt(po.grand_total ?? po.total_amount)}
                  </span>
                </div>
                {po.warehouse && (
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>Warehouse</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                      {po.warehouse.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Status timeline */}
              <div style={{ marginTop: 20 }}>
                <StatusStepper status={status} />
              </div>
            </div>

            {/* Grand total KPI */}
            <div style={{ padding: '12px 20px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', textAlign: 'center', minWidth: 150 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>Grand Total</p>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1 }}>
                {fmt(grandTotal)}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
                {items.length} item{items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── Action buttons (vary by status + role) ── */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            {/* draft or submitted: Approve and Cancel (Admin only) */}
            {(status === 'draft' || status === 'submitted') && isAdmin && (
              <>
                <Button variant="primary" size="sm" leftIcon={<ApproveIcon style={{ fontSize: 16 }} />} loading={actionLoading === 'approve'} onClick={() => setApproveOpen(true)}>
                  Approve PO
                </Button>
                <Button variant="danger-ghost" size="sm" leftIcon={<CancelIcon style={{ fontSize: 16 }} />} loading={actionLoading === 'cancel'} onClick={() => setCancelOpen(true)}>
                  Cancel PO
                </Button>
              </>
            )}

            {/* draft only: Submit for Approval (Manager only) */}
            {status === 'draft' && isMgr && (
              <Button variant="primary" size="sm" leftIcon={<SubmitIcon style={{ fontSize: 16 }} />} loading={actionLoading === 'submit'} onClick={() => doAction('submit')}>
                Submit for Approval
              </Button>
            )}

            {/* draft only: Edit button (Admin or Manager) */}
            {status === 'draft' && (isAdmin || isMgr) && (
              <Button variant="secondary" size="sm" leftIcon={<EditIcon style={{ fontSize: 16 }} />} onClick={() => navigate(`/purchase-orders/${id}/edit`)}>
                Edit
              </Button>
            )}

            {/* approved or shipped (confirmed): Receive Goods (Admin or Manager) */}
            {(status === 'approved' || status === 'shipped') && (isAdmin || isMgr) && (
              <Button variant="primary" size="sm" leftIcon={<ReceiveIcon style={{ fontSize: 16 }} />} onClick={openReceive}>
                Receive Goods
              </Button>
            )}

            {/* approved or shipped (confirmed): Cancel PO (Admin only) */}
            {(status === 'approved' || status === 'shipped') && isAdmin && (
              <Button variant="danger-ghost" size="sm" leftIcon={<CancelIcon style={{ fontSize: 16 }} />} loading={actionLoading === 'cancel'} onClick={() => setCancelOpen(true)}>
                Cancel PO
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* ── Supplier details ── */}
      {po.supplier && (
        <Card title="Supplier Information">
          <Card.Body>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px 24px', margin: 0 }}>
              <DLItem label="Company"       value={po.supplier.name} />
              <DLItem label="Contact"       value={po.supplier.contact_person} />
              <DLItem label="Email"         value={po.supplier.email} />
              <DLItem label="Phone"         value={po.supplier.phone} />
              <DLItem label="Rating"        value={po.supplier.rating > 0 ? `${'★'.repeat(Math.round(po.supplier.rating))} ${Number(po.supplier.rating).toFixed(1)}` : '—'} />
              <DLItem label="Lead Time"     value={po.supplier.lead_time ? `${po.supplier.lead_time} days` : '—'} />
            </dl>
          </Card.Body>
        </Card>
      )}

      {/* ── Line items table ── */}
      <Card title="Line Items" padding={false}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 40 }}>#</th>
                <th style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                <th style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU</th>
                <th style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Ordered Qty</th>
                {po.status === 'received' && (
                  <th style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Received Qty</th>
                )}
                <th style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Unit Price</th>
                <th style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={po.status === 'received' ? 7 : 6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)', borderBottom: 'none' }}>No items.</td></tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ ...tdStyle, color: 'var(--color-text-muted)', width: 40 }}>{idx + 1}</td>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{item.product_name}</span></td>
                    <td style={tdStyle}><code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', background: 'var(--color-surface-alt)', padding: '2px 6px', borderRadius: 4 }}>{item.sku}</code></td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                    {po.status === 'received' && (
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: 'var(--color-success)' }}>
                        {item.quantity_received ?? item.quantity}
                      </td>
                    )}
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt(item.unit_cost)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(item.total_cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <TotalRow label="Subtotal"              value={fmt(subtotal)} />
            <TotalRow label={`Tax (${po.tax_percent ?? 0}%)`} value={fmt(taxAmount)} />
            <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 6, marginTop: 2 }}>
              <TotalRow label="Grand Total" value={fmt(grandTotal)} bold />
            </div>
          </div>
        </div>
      </Card>

      {/* ── Notes ── */}
      {po.notes && (
        <Card title="Notes">
          <Card.Body>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {po.notes}
            </p>
          </Card.Body>
        </Card>
      )}

      {/* ════════════════════════════════════════════════
          Cancel Confirmation Modal
      ════════════════════════════════════════════════ */}
      {/* ── Approve Confirmation Modal ── */}
      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve Purchase Order" size="sm">
        <Modal.Body>
          <p style={{ margin: 0, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
            Approve "{po.po_number}"?
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
            Are you sure you want to approve this purchase order? This will move it to the Confirmed status.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setApproveOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" loading={actionLoading === 'approve'} onClick={async () => { setApproveOpen(false); await doApprove(); }}>
            Approve PO
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Cancel Confirmation Modal ── */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Purchase Order" size="sm">
        <Modal.Body>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <WarnIcon style={{ color: 'var(--color-danger)', fontSize: 22 }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
                  Cancel "{po.po_number}"?
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                  This action cannot be undone. Cancelled POs cannot be reactivated.
                </p>
              </div>
            </div>
            <div style={{ width: '100%', marginTop: 8 }}>
              <Input
                label="Reason for Cancellation"
                placeholder="Enter reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setCancelOpen(false)}>Keep PO</Button>
          <Button variant="danger" size="sm" loading={actionLoading === 'cancel'} disabled={!cancelReason.trim()} onClick={async () => { setCancelOpen(false); await doCancel(); }}>
            Cancel PO
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ════════════════════════════════════════════════
          Receive Goods Modal
      ════════════════════════════════════════════════ */}
      <Modal open={receiveOpen} onClose={() => !receiving && setReceiveOpen(false)} title="Receive Goods" size="lg">
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Select
              label="Destination Warehouse"
              required
              value={receiveWH}
              onChange={(e) => setReceiveWH(e.target.value)}
              helper="Stock will be added to this warehouse"
            >
              <option value="">Select warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
              ))}
            </Select>

            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Product', 'Ordered', 'Receive Qty', 'Batch #', 'Expiry Date'].map((h) => (
                      <th key={h} style={{ ...tdStyle, background: 'var(--color-surface-alt)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receiveItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{item.sku}</div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{item.ordered_qty}</td>
                      <td style={{ ...tdStyle, width: 100 }}>
                        <input
                          type="number" min="0" max={item.ordered_qty}
                          value={item.quantity_received}
                          onChange={(e) => {
                            const copy = [...receiveItems];
                            copy[idx] = { ...copy[idx], quantity_received: e.target.value };
                            setReceiveItems(copy);
                          }}
                          style={{ width: 80, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ ...tdStyle, width: 130 }}>
                        <input
                          type="text" placeholder="BATCH-001"
                          value={item.batch_no}
                          onChange={(e) => {
                            const copy = [...receiveItems];
                            copy[idx] = { ...copy[idx], batch_no: e.target.value };
                            setReceiveItems(copy);
                          }}
                          style={{ width: 110, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}
                        />
                      </td>
                      <td style={{ ...tdStyle, width: 140 }}>
                        <input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => {
                            const copy = [...receiveItems];
                            copy[idx] = { ...copy[idx], expiry_date: e.target.value };
                            setReceiveItems(copy);
                          }}
                          style={{ width: 130, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setReceiveOpen(false)} disabled={receiving}>Cancel</Button>
          <Button variant="primary"   size="sm" loading={receiving} leftIcon={<ReceiveIcon style={{ fontSize: 16 }} />} onClick={confirmReceive}>
            Confirm Receipt & Update Stock
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

/* ── Micro helpers ─────────────────────────────────────────────── */
function MetaChip({ icon, label }) {
  if (!label) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
      {label}
    </span>
  );
}

function DLItem({ label, value }) {
  return (
    <div>
      <dt style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 500, color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>{value || '—'}</dd>
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
