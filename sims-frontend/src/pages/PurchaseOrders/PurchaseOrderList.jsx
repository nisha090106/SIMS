import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Add as AddIcon,
  Search as SearchIcon,
  RefreshOutlined as RefreshIcon,
  DownloadOutlined as ExportIcon,
  AutoAwesome as AutoIcon,
  Inventory2Outlined as EmptyIcon,
  WarningAmberOutlined as WarnIcon,
  InventoryOutlined as ReceiveIcon,
} from '@mui/icons-material';
import { purchaseOrderAPI, warehouseAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { STATUS_CONFIG, fmt, fmtDate, parseItems } from './poHelpers';

/* ── Constants ───────────────────────────────────────────────── */
const TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'approved', label: 'Approved' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'received', label: 'Received' },
  { id: 'cancelled', label: 'Cancelled' },
];

/* ── Reducer ─────────────────────────────────────────────────── */
const INIT = { orders: [], total: 0, totalPages: 1, loading: true };
function reducer(s, a) {
  switch (a.type) {
    case 'START':
      return { ...s, loading: true };
    case 'OK':
      return { ...s, loading: false, ...a.payload };
    case 'ERR':
      return { ...s, loading: false };
    default:
      return s;
  }
}

/* ── CSV export ──────────────────────────────────────────────── */
function exportCSV(orders) {
  const rows = [
    [
      'PO Number',
      'Supplier',
      'Warehouse',
      'Status',
      'Items',
      'Total',
      'Expected Delivery',
      'Created',
    ],
    ...orders.map((po) => [
      po.po_number,
      po.supplier?.name ?? '',
      po.warehouse?.name ?? '',
      po.status,
      parseItems(po.items).length,
      po.grand_total ?? po.total_amount,
      fmtDate(po.expected_delivery),
      fmtDate(po.created_at),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `purchase-orders-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════════════
   PurchaseOrderList
══════════════════════════════════════════════════════════════ */
export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((s) => s.auth);
  const isAdmin = user?.role === 'admin';
  const isMgr = user?.role === 'manager';
  const canCreate = isAdmin || isMgr;

  const [state, dispatch] = useReducer(reducer, INIT);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [debSearch, setDeb] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const debRef = useRef(null);

  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      setDeb(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(debRef.current);
  }, [search]);

  const fetchOrders = useCallback(async () => {
    dispatch({ type: 'START' });
    try {
      const res = await purchaseOrderAPI.getAll({
        page,
        limit,
        status: tab !== 'all' ? tab : undefined,
        search: debSearch || undefined,
      });
      const d = res.data.data;
      dispatch({
        type: 'OK',
        payload: { orders: d.orders, total: d.total, totalPages: d.totalPages },
      });
    } catch (err) {
      dispatch({ type: 'ERR' });
      showToast(err.response?.data?.error || 'Failed to load purchase orders', 'error');
    }
  }, [page, limit, tab, debSearch, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Modal state
  const [activePO, setActivePO] = useState(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveWH, setReceiveWH] = useState('');
  const [receiveItems, setReceiveItems] = useState([]);
  const [actionLoading, setActionLoading] = useState('');
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    warehouseAPI
      .getAll()
      .then((r) => setWarehouses(r.data.data || []))
      .catch(() => {});
  }, []);

  function openApproveModal(po) {
    setActivePO(po);
    setApproveOpen(true);
  }

  async function confirmApprove() {
    if (!activePO) return;
    const poId = activePO.po_id;
    setActionLoading(`approve-${poId}`);
    try {
      if (activePO.status === 'draft') {
        await purchaseOrderAPI.submit(poId);
      }
      await purchaseOrderAPI.approve(poId);
      showToast('PO approved successfully', 'success');
      setApproveOpen(false);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.error || 'Approve failed', 'error');
    } finally {
      setActionLoading('');
    }
  }

  function openCancelModal(po) {
    setActivePO(po);
    setCancelReason('');
    setCancelOpen(true);
  }

  async function confirmCancel() {
    if (!activePO) return;
    const poId = activePO.po_id;
    setActionLoading(`cancel-${poId}`);
    try {
      await purchaseOrderAPI.cancel(poId, { reason: cancelReason });
      showToast('PO cancelled successfully', 'success');
      setCancelOpen(false);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.error || 'Cancel failed', 'error');
    } finally {
      setActionLoading('');
    }
  }

  function openReceiveModal(po) {
    setActivePO(po);
    const items = parseItems(po.items).map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      sku: i.sku,
      ordered_qty: i.quantity,
      quantity_received: i.quantity,
      batch_no: '',
      expiry_date: '',
    }));
    setReceiveItems(items);
    setReceiveWH(po.warehouse_id || '');
    setReceiveOpen(true);
  }

  async function confirmReceive() {
    if (!activePO) return;
    if (!receiveWH) {
      showToast('Select a destination warehouse', 'error');
      return;
    }
    const poId = activePO.po_id;
    setActionLoading(`receive-${poId}`);
    try {
      await purchaseOrderAPI.receive(poId, {
        warehouse_id: receiveWH,
        received_items: receiveItems.map((i) => ({
          product_id: i.product_id,
          quantity_received: Number(i.quantity_received) || 0,
          batch_no: i.batch_no || undefined,
          expiry_date: i.expiry_date || undefined,
        })),
      });
      showToast('Goods received and stock updated', 'success');
      setReceiveOpen(false);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.error || 'Receive failed', 'error');
    } finally {
      setActionLoading('');
    }
  }

  const { orders, total, totalPages, loading } = state;

  const td = {
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-border)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-primary)',
    verticalAlign: 'middle',
  };

  const columns = [
    { key: 'po', label: 'PO Number', width: 160 },
    { key: 'supplier', label: 'Supplier' },
    ...(isAdmin ? [{ key: 'warehouse', label: 'Warehouse', width: 130 }] : []),
    { key: 'items', label: 'Items', width: 70, align: 'center' },
    { key: 'total', label: 'Total', width: 130, align: 'right' },
    { key: 'status', label: 'Status', width: 120, align: 'center' },
    { key: 'delivery', label: 'Expected', width: 120 },
    { key: 'actions', label: '', width: 180, align: 'right' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Purchase Orders
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {total} orders total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant='ghost'
            size='sm'
            leftIcon={<ExportIcon style={{ fontSize: 16 }} />}
            onClick={() => exportCSV(orders)}
          >
            Export CSV
          </Button>
          <Button
            variant='ghost'
            size='sm'
            leftIcon={<RefreshIcon style={{ fontSize: 16 }} />}
            onClick={fetchOrders}
            loading={loading}
          >
            Refresh
          </Button>
          {canCreate && (
            <Button
              variant='primary'
              size='sm'
              leftIcon={<AddIcon style={{ fontSize: 18 }} />}
              onClick={() => navigate('/purchase-orders/new')}
            >
              New PO
            </Button>
          )}
        </div>
      </div>

      {/* ── Status tab bar ── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--color-border)',
          flexWrap: 'wrap',
          gap: 0,
        }}
      >
        {TABS.map(({ id, label }) => {
          const cfg = STATUS_CONFIG[id];
          return (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setPage(1);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '9px 14px',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: tab === id ? 700 : 500,
                color:
                  tab === id ? cfg?.color || 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderBottom: `2px solid ${tab === id ? cfg?.color || 'var(--color-primary)' : 'transparent'}`,
                marginBottom: -2,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Table card ── */}
      <Card padding={false}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: '1 1 200px' }}>
            <Input
              placeholder='Search PO number…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon style={{ fontSize: 16 }} />}
            />
          </div>
          <div style={{ flex: '0 0 110px' }}>
            <Select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50].map((l) => (
                <option key={l} value={l}>
                  {l} / page
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Table
          columns={columns}
          data={orders}
          loading={loading}
          emptyText='No purchase orders found.'
          emptyIcon={<EmptyIcon />}
          renderRow={(po, i) => {
            const items = parseItems(po.items);
            const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.draft;
            const isAuto = po.auto_drafted;

            return (
              <tr
                key={po.po_id ?? i}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/purchase-orders/${po.po_id}`)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--color-surface-alt)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {/* PO Number */}
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                      }}
                    >
                      {po.po_number}
                    </span>
                    {isAuto && (
                      <AutoIcon
                        className='auto-draft-icon'
                        style={{ fontSize: 13, color: 'var(--color-warning)' }}
                        titleAccess='Auto-drafted'
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      marginTop: 1,
                    }}
                  >
                    {fmtDate(po.created_at)}
                  </div>
                </td>

                {/* Supplier */}
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{po.supplier?.name ?? '—'}</div>
                  {po.supplier?.rating > 0 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                      {'★'.repeat(Math.round(po.supplier.rating))}{' '}
                      {Number(po.supplier.rating).toFixed(1)}
                    </div>
                  )}
                </td>

                {/* Warehouse (admin only) */}
                {isAdmin && (
                  <td
                    style={{
                      ...td,
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {po.warehouse?.name ?? '—'}
                  </td>
                )}

                {/* Items count */}
                <td style={{ ...td, textAlign: 'center' }}>
                  <Badge variant='neutral' size='sm'>
                    {items.length}
                  </Badge>
                </td>

                {/* Total */}
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  {fmt(po.grand_total ?? po.total_amount)}
                </td>

                {/* Status */}
                <td style={{ ...td, textAlign: 'center' }}>
                  <Badge variant={cfg.variant} size='sm' dot>
                    {cfg.label}
                  </Badge>
                </td>

                {/* Expected delivery */}
                <td
                  style={{
                    ...td,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {fmtDate(po.expected_delivery)}
                </td>

                {/* Quick actions */}
                <td style={{ ...td, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                    }}
                  >
                    {(po.status === 'draft' || po.status === 'submitted') && isAdmin ? (
                      <>
                        <Button
                          variant='primary'
                          size='sm'
                          loading={actionLoading === `approve-${po.po_id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openApproveModal(po);
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant='danger-ghost'
                          size='sm'
                          loading={actionLoading === `cancel-${po.po_id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openCancelModal(po);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (po.status === 'approved' || po.status === 'shipped') &&
                      (isAdmin || isMgr) ? (
                      <Button
                        variant='primary'
                        size='sm'
                        loading={actionLoading === `receive-${po.po_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openReceiveModal(po);
                        }}
                      >
                        Receive
                      </Button>
                    ) : (
                      <Link
                        to={`/purchase-orders/${po.po_id}`}
                        style={{
                          color: 'var(--color-primary)',
                          fontSize: 'var(--text-sm)',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        View details
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          }}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid var(--color-border)',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button variant='secondary' size='sm' disabled={page <= 1} onClick={() => setPage(1)}>
                «
              </Button>
              <Button
                variant='secondary'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹ Prev
              </Button>
              <Button
                variant='secondary'
                size='sm'
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </Button>
              <Button
                variant='secondary'
                size='sm'
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                »
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Approve Confirmation Modal ── */}
      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title='Approve Purchase Order'
        size='sm'
      >
        <Modal.Body>
          {activePO && (
            <>
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Approve "{activePO.po_number}"?
              </p>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 1.5,
                }}
              >
                Are you sure you want to approve this purchase order? This will move it to the
                Confirmed status.
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' size='sm' onClick={() => setApproveOpen(false)}>
            Cancel
          </Button>
          <Button
            variant='primary'
            size='sm'
            loading={actionLoading === `approve-${activePO?.po_id}`}
            onClick={confirmApprove}
          >
            Approve PO
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Cancel Confirmation Modal ── */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title='Cancel Purchase Order'
        size='sm'
      >
        <Modal.Body>
          {activePO && (
            <div
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--color-danger-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <WarnIcon style={{ color: 'var(--color-danger)', fontSize: 22 }} />
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontFamily: 'var(--font-sans)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Cancel "{activePO.po_number}"?
                  </p>
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-sans)',
                      lineHeight: 1.5,
                    }}
                  >
                    This action cannot be undone. Cancelled POs cannot be reactivated.
                  </p>
                </div>
              </div>
              <div style={{ width: '100%', marginTop: 8 }}>
                <Input
                  label='Reason for Cancellation'
                  placeholder='Enter reason...'
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' size='sm' onClick={() => setCancelOpen(false)}>
            Keep PO
          </Button>
          <Button
            variant='danger'
            size='sm'
            loading={actionLoading === `cancel-${activePO?.po_id}`}
            disabled={!cancelReason.trim()}
            onClick={confirmCancel}
          >
            Cancel PO
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Receive Goods Modal ── */}
      <Modal
        open={receiveOpen}
        onClose={() => !actionLoading && setReceiveOpen(false)}
        title='Receive Goods'
        size='lg'
      >
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Select
              label='Destination Warehouse'
              required
              value={receiveWH}
              onChange={(e) => setReceiveWH(e.target.value)}
              helper='Stock will be added to this warehouse'
            >
              <option value=''>Select warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.warehouse_id} value={w.warehouse_id}>
                  {w.name}
                </option>
              ))}
            </Select>

            <div
              style={{
                overflowX: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Product', 'Ordered', 'Receive Qty', 'Batch #', 'Expiry Date'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--color-border)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'var(--color-text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: 'var(--color-surface-alt)',
                          verticalAlign: 'middle',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receiveItems.map((item, idx) => (
                    <tr key={idx}>
                      <td
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--color-border)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)',
                          verticalAlign: 'middle',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {item.sku}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--color-border)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)',
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          fontWeight: 700,
                        }}
                      >
                        {item.ordered_qty}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--color-border)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)',
                          verticalAlign: 'middle',
                          width: 100,
                        }}
                      >
                        <input
                          type='number'
                          min='0'
                          max={item.ordered_qty}
                          value={item.quantity_received}
                          onChange={(e) => {
                            const copy = [...receiveItems];
                            copy[idx] = { ...copy[idx], quantity_received: e.target.value };
                            setReceiveItems(copy);
                          }}
                          style={{
                            width: 80,
                            padding: '4px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-sm)',
                            textAlign: 'center',
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--color-border)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)',
                          verticalAlign: 'middle',
                          width: 130,
                        }}
                      >
                        <input
                          type='text'
                          placeholder='BATCH-001'
                          value={item.batch_no}
                          onChange={(e) => {
                            const copy = [...receiveItems];
                            copy[idx] = { ...copy[idx], batch_no: e.target.value };
                            setReceiveItems(copy);
                          }}
                          style={{
                            width: 110,
                            padding: '4px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-sm)',
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--color-border)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)',
                          verticalAlign: 'middle',
                          width: 140,
                        }}
                      >
                        <input
                          type='date'
                          value={item.expiry_date}
                          onChange={(e) => {
                            const copy = [...receiveItems];
                            copy[idx] = { ...copy[idx], expiry_date: e.target.value };
                            setReceiveItems(copy);
                          }}
                          style={{
                            width: 130,
                            padding: '4px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-sm)',
                          }}
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
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setReceiveOpen(false)}
            disabled={!!actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant='primary'
            size='sm'
            loading={actionLoading === `receive-${activePO?.po_id}`}
            leftIcon={<ReceiveIcon style={{ fontSize: 16 }} />}
            onClick={confirmReceive}
          >
            Confirm Receipt & Update Stock
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
