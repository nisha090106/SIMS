import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Search as SearchIcon,
  Add as AddIcon,
  SwapHoriz as TransferIcon,
  TuneOutlined as AdjustIcon,
  DownloadOutlined as ExportIcon,
  Inventory2Outlined as EmptyIcon,
  WarningAmberOutlined as WarnIcon,
  RefreshOutlined as RefreshIcon,
} from '@mui/icons-material';
import { inventoryAPI, warehouseAPI, categoryAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import ValuationSummary from './ValuationSummary';
import StockOperationModal from './StockOperationModal';
import TransferModal from './TransferModal';

/* ── constants ───────────────────────────────────────────────── */
const TABS = [
  { id: 'all',       label: 'All Stock' },
  { id: 'low',       label: 'Low Stock' },
  { id: 'out',       label: 'Out of Stock' },
  { id: 'expiring',  label: 'Expiring Soon' },
];

/* ── reducer ─────────────────────────────────────────────────── */
const INIT = { rows: [], total: 0, page: 1, totalPages: 1, loading: true };
function reducer(s, a) {
  switch (a.type) {
    case 'START': return { ...s, loading: true };
    case 'OK':    return { ...s, loading: false, ...a.payload };
    case 'ERR':   return { ...s, loading: false };
    default:      return s;
  }
}

/* ── helpers ─────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function stockBadge(status) {
  if (status === 'out_of_stock') return <Badge variant="danger"  dot size="sm">Out of Stock</Badge>;
  if (status === 'low_stock')    return <Badge variant="warning" dot size="sm">Low Stock</Badge>;
  return                                <Badge variant="success" dot size="sm">In Stock</Badge>;
}

function expiryBadge(date) {
  if (!date) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
  const d    = new Date(date);
  const days = Math.ceil((d - Date.now()) / 86400000);
  if (days <= 0)  return <Badge variant="danger"  size="sm">Expired</Badge>;
  if (days <= 7)  return <Badge variant="danger"  size="sm">{days}d</Badge>;
  if (days <= 30) return <Badge variant="warning" size="sm">{days}d</Badge>;
  return fmtDate(date);
}

/* ── CSV export ──────────────────────────────────────────────── */
function exportCSV(rows) {
  const headers = ['SKU','Product','Category','Warehouse','Location','Batch','Qty','Reserved','Available','Expiry','Value','Status'];
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.sku, `"${r.product_name}"`, r.category, `"${r.warehouse_name}"`,
      r.location || '', r.batch_no || '', r.quantity, r.reserved_qty, r.available_qty,
      r.expiry_date ? new Date(r.expiry_date).toISOString().split('T')[0] : '',
      r.stockValue?.toFixed(2), r.stockStatus,
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `inventory-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════════════
   InventoryList
══════════════════════════════════════════════════════════════ */
export default function InventoryList({ warehouseId: fixedWarehouseId } = {}) {
  const { showToast } = useToast();
  const { user }   = useSelector((s) => s.auth);
  const isAdmin    = user?.role === 'admin';
  const isMgr      = user?.role === 'manager';
  const canWrite   = isAdmin || isMgr || user?.role === 'staff';

  const [state, dispatch] = useReducer(reducer, INIT);
  const [tab, setTab]     = useState('all');
  const [search, setSearch]         = useState('');
  const [debounced, setDebounced]   = useState('');
  const [warehouseFilter, setWHF]   = useState(fixedWarehouseId || '');
  const [categoryFilter, setCatF]   = useState('');
  const [limit, setLimit]           = useState(20);
  const [page, setPage]             = useState(1);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [valuation, setValuation]   = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [opModal, setOpModal]       = useState(null); // 'stock-in' | 'stock-out' | 'adjust'
  const [transferOpen, setTransfer] = useState(false);

  const debRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Define loadValuation callback first
  const loadValuation = useCallback(() => {
    inventoryAPI.getValuation().then((r) => {
      setValuation(r.data.data);
      setLastRefresh(new Date());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setDebounced(search); setPage(1); }, 320);
    return () => clearTimeout(debRef.current);
  }, [search]);

  // Load filter data once and setup auto-refresh
  useEffect(() => {
    if (isAdmin) {
      warehouseAPI.getAll().then((r) => setWarehouses(r.data.data || [])).catch(() => {});
    }
    categoryAPI.getAll().then((r) => setCategories(r.data.data || [])).catch(() => {});
    loadValuation();

    // Auto-refresh valuation every 15 seconds for near-real-time stock value updates
    refreshIntervalRef.current = setInterval(() => {
      loadValuation();
    }, 15_000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [isAdmin, loadValuation]);

  const buildParams = useCallback(() => ({
    page, limit,
    search:        debounced  || undefined,
    warehouseId:   warehouseFilter || undefined,
    category:      categoryFilter  || undefined,
    lowStock:      tab === 'low'      ? 'true' : undefined,
    outOfStock:    tab === 'out'      ? 'true' : undefined,
    expiringSoon:  tab === 'expiring' ? 'true' : undefined,
  }), [page, limit, debounced, warehouseFilter, categoryFilter, tab]);

  const fetchInventory = useCallback(async () => {
    dispatch({ type: 'START' });
    try {
      const res = await inventoryAPI.getAll(buildParams());
      const d   = res.data.data;
      dispatch({ type: 'OK', payload: { rows: d.inventory, total: d.total, page: d.page, totalPages: d.totalPages } });
    } catch (err) {
      dispatch({ type: 'ERR' });
      showToast(err.response?.data?.error || 'Failed to load inventory', 'error');
    }
  }, [buildParams, showToast]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchInventory(), loadValuation()]);
    setRefreshing(false);
    showToast('Inventory updated', 'success');
  };

  const { rows, total, totalPages, loading } = state;

  /* ── Table columns ── */
  const columns = [
    { key: 'product', label: 'Product' },
    { key: 'sku',     label: 'SKU',      width: 110 },
    ...(isAdmin ? [{ key: 'warehouse', label: 'Warehouse', width: 140 }] : []),
    { key: 'location', label: 'Location', width: 110 },
    { key: 'batch',    label: 'Batch',    width: 110 },
    { key: 'qty',      label: 'Qty',      width: 80,  align: 'center' },
    { key: 'reserved', label: 'Reserved', width: 90,  align: 'center' },
    { key: 'avail',    label: 'Available',width: 90,  align: 'center' },
    { key: 'expiry',   label: 'Expiry',   width: 110 },
    { key: 'value',    label: 'Value',    width: 110, align: 'right' },
    { key: 'status',   label: 'Status',   width: 120, align: 'center' },
  ];

  const td = { padding: '10px 14px', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
            Inventory
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
              {total} records — stock values in ₹ INR
            </p>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 0 2px rgba(16,185,129,0.25)',
                animation: 'livePulse 2s ease-in-out infinite',
                display: 'inline-block',
              }} />
              <span style={{ fontSize: 11, color: '#000000', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                Live
              </span>
            </span>
            {lastRefresh && (
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
                · {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canWrite && (
            <>
              <Button variant="secondary" size="sm" leftIcon={<AddIcon style={{ fontSize: 16 }} />} onClick={() => setOpModal('stock-in')}>
                Stock In
              </Button>
              <Button variant="secondary" size="sm" leftIcon={<AddIcon style={{ fontSize: 16 }} />} onClick={() => setOpModal('stock-out')} style={{ color: 'var(--color-danger)' }}>
                Stock Out
              </Button>
            </>
          )}
          {(isAdmin || isMgr) && (
            <>
              <Button variant="secondary" size="sm" leftIcon={<TransferIcon style={{ fontSize: 16 }} />} onClick={() => setTransfer(true)}>
                Transfer
              </Button>
              <Button variant="secondary" size="sm" leftIcon={<AdjustIcon style={{ fontSize: 16 }} />} onClick={() => setOpModal('adjust')}>
                Adjust
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" leftIcon={<ExportIcon style={{ fontSize: 16 }} />} onClick={() => exportCSV(rows)}>
            Export CSV
          </Button>
          <Button variant="ghost" size="sm"
            leftIcon={<RefreshIcon style={{ fontSize: 16, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />}
            onClick={refresh} loading={refreshing || loading}
            title={lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Click to refresh'}>
            Refresh
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>

      {/* ── Valuation summary ── */}
      <ValuationSummary valuation={valuation} isAdmin={isAdmin} />

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)' }}>
        {TABS.map(({ id: tid, label }) => (
          <button key={tid} onClick={() => { setTab(tid); setPage(1); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 16px', fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: tab === tid ? 700 : 500,
              color: tab === tid ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: `2px solid ${tab === tid ? 'var(--color-primary)' : 'transparent'}`,
              marginBottom: -2, whiteSpace: 'nowrap',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card padding={false}>
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Input placeholder="Search product / SKU…" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<SearchIcon style={{ fontSize: 16 }} />} />
          </div>
          {isAdmin && (
            <div style={{ flex: '0 0 160px' }}>
              <Select value={warehouseFilter} onChange={(e) => { setWHF(e.target.value); setPage(1); }}>
                <option value="">All Warehouses</option>
                {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
              </Select>
            </div>
          )}
          <div style={{ flex: '0 0 150px' }}>
            <Select value={categoryFilter} onChange={(e) => { setCatF(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </Select>
          </div>
          <div style={{ flex: '0 0 110px' }}>
            <Select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50].map((l) => <option key={l} value={l}>{l} / page</option>)}
            </Select>
          </div>
        </div>

        {/* ── Table ── */}
        <Table
          columns={columns}
          data={rows}
          loading={loading}
          emptyText={tab === 'low' ? 'No low stock items — all products are healthy.' : tab === 'out' ? 'No out-of-stock items.' : 'No inventory records found.'}
          emptyIcon={<EmptyIcon />}
          renderRow={(row, i) => (
            <tr key={row.id ?? i} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
              <td style={td}>
                <div style={{ fontWeight: 600 }}>{row.product_name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 1 }}>{row.category}</div>
              </td>
              <td style={td}><code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', background: 'var(--color-surface-alt)', padding: '2px 5px', borderRadius: 3 }}>{row.sku}</code></td>
              {isAdmin && <td style={{ ...td, color: 'var(--color-text-secondary)' }}>{row.warehouse_name}</td>}
              <td style={{ ...td, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{row.location || '—'}</td>
              <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{row.batch_no || '—'}</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{row.quantity}</td>
              <td style={{ ...td, textAlign: 'center', color: 'var(--color-text-secondary)' }}>{row.reserved_qty ?? 0}</td>
              <td style={{ ...td, textAlign: 'center' }}>
                <Badge variant={row.available_qty > 0 ? 'success' : 'danger'} size="sm">{row.available_qty ?? row.quantity}</Badge>
              </td>
              <td style={td}>{expiryBadge(row.expiry_date)}</td>
              <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{fmt(row.stockValue)}</td>
              <td style={{ ...td, textAlign: 'center' }}>{stockBadge(row.stockStatus)}</td>
            </tr>
          )}
        />

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
              {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button variant="secondary" size="sm" disabled={page <= 1}         onClick={() => setPage(1)}>«</Button>
              <Button variant="secondary" size="sm" disabled={page <= 1}         onClick={() => setPage((p) => p - 1)}>‹ Prev</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Stock operation modal ── */}
      {opModal && (
        <StockOperationModal
          mode={opModal}
          warehouses={warehouses}
          isAdmin={isAdmin}
          userId={user?.id || user?.user_id}
          onClose={() => setOpModal(null)}
          onSuccess={(msg) => { setOpModal(null); showToast(msg, 'success'); refresh(); }}
        />
      )}

      {/* ── Transfer modal ── */}
      {transferOpen && (
        <TransferModal
          warehouses={warehouses}
          isAdmin={isAdmin}
          userId={user?.id || user?.user_id}
          onClose={() => setTransfer(false)}
          onSuccess={(msg) => { setTransfer(false); showToast(msg, 'success'); refresh(); }}
        />
      )}
    </div>
  );
}
