import React, { useCallback, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Inventory2 as StockIcon,
  CurrencyRupee as ValueIcon,
  WarningAmber as LowStockIcon,
  ShoppingCart as POIcon,
  Assignment as RequestIcon,
  Storefront as WarehouseIcon,
  People as SupplierIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendIcon,
  CheckCircleOutline as CheckIcon,
  HourglassEmpty as PendingIcon,
  LocalShipping as FulfilledIcon,
  AddCircleOutline as CreateIcon,
  EditOutlined as UpdateIcon,
  DeleteOutline as DeleteIcon,
  LoginOutlined as LoginIcon,
  QrCodeScanner as BarcodeIcon,
  ReceiptLong as POActionIcon,
  InfoOutlined as InfoIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { dashboardAPI, purchaseOrderAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Table from '../components/ui/Table';

/* ── constants ──────────────────────────────────────────────── */
const PIE_COLORS = {
  pending: '#D97706',
  approved: '#2563EB',
  fulfilled: '#16A34A',
  rejected: '#DC2626',
  cancelled: '#94A3B8',
};
const PIE_FALLBACK = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#7C3AED'];

/* ── reducer ────────────────────────────────────────────────── */
const INIT = {
  stats: null,
  charts: null,
  loading: true,
  error: null,
  recentActivity: [],
  warehouseBreakdown: [],
  recentRequests: [],
};
function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_OK':
      return { ...state, loading: false, ...action.payload };
    case 'FETCH_ERR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

/* ── helpers ─────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function activityIcon(action = '') {
  const a = action.toUpperCase();
  if (a.includes('CREATE') || a.includes('CREATE_PURCHASE'))
    return <CreateIcon style={{ fontSize: 15, color: 'var(--color-success)' }} />;
  if (a.includes('UPDATE'))
    return <UpdateIcon style={{ fontSize: 15, color: 'var(--color-primary)' }} />;
  if (a.includes('DELETE'))
    return <DeleteIcon style={{ fontSize: 15, color: 'var(--color-danger)' }} />;
  if (a.includes('LOGIN'))
    return <LoginIcon style={{ fontSize: 15, color: 'var(--color-info)' }} />;
  if (a.includes('BARCODE'))
    return <BarcodeIcon style={{ fontSize: 15, color: 'var(--color-warning)' }} />;
  if (a.includes('PURCHASE') || a.includes('APPROVE'))
    return <POActionIcon style={{ fontSize: 15, color: 'var(--color-primary)' }} />;
  if (a.includes('FULFILLED'))
    return <FulfilledIcon style={{ fontSize: 15, color: 'var(--color-success)' }} />;
  return <InfoIcon style={{ fontSize: 15, color: 'var(--color-text-muted)' }} />;
}

function statusBadgeVariant(status) {
  const map = {
    pending: 'warning',
    approved: 'primary',
    fulfilled: 'success',
    rejected: 'danger',
    cancelled: 'neutral',
  };
  return map[status] || 'neutral';
}

/* ── KPI Card ────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, sub, variant = 'neutral', loading }) => (
  <Card style={{ flex: 1, minWidth: 0 }}>
    <Card.Body>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon blob */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: variantSoft(variant),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, {
            style: { fontSize: 22, color: variantColor(variant) },
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {label}
          </p>

          {loading ? (
            <div
              style={{
                marginTop: 8,
                height: 28,
                width: '60%',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface-alt)',
                animation: 'sims-skeleton 1.4s ease infinite',
              }}
            />
          ) : (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1,
              }}
            >
              {value}
            </p>
          )}

          {sub && !loading && (
            <div style={{ marginTop: 6 }}>
              <Badge variant={variant} size='sm' dot>
                {sub}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card.Body>
    <style>{`@keyframes sims-skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
  </Card>
);

function variantColor(v) {
  const map = {
    primary: 'var(--color-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)',
    neutral: 'var(--color-text-secondary)',
  };
  return map[v] || map.neutral;
}
function variantSoft(v) {
  const map = {
    primary: 'var(--color-primary-soft)',
    success: 'var(--color-success-soft)',
    warning: 'var(--color-warning-soft)',
    danger: 'var(--color-danger-soft)',
    info: 'var(--color-info-soft)',
    neutral: 'var(--color-surface-alt)',
  };
  return map[v] || map.neutral;
}

/* ── Recharts shared tooltip style ─────────────────────────── */
const chartTooltipStyle = {
  contentStyle: {
    background: '#0F172A',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    color: '#000000',
  },
  itemStyle: { color: '#000000' },
  labelStyle: { color: '#000000', fontWeight: 700 },
};

/* ── Activity skeleton ───────────────────────────────────────── */
const ActivitySkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--color-surface-alt)',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 12,
              width: '70%',
              borderRadius: 4,
              background: 'var(--color-surface-alt)',
              marginBottom: 6,
            }}
          />
          <div
            style={{
              height: 10,
              width: '40%',
              borderRadius: 4,
              background: 'var(--color-surface-alt)',
            }}
          />
        </div>
      </div>
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((s) => s.auth);
  const role = user?.role || 'staff';

  const [state, dispatch] = useReducer(reducer, INIT);
  const [lastUpdated, setLastUpdated] = React.useState(null);

  const fetchAll = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const [statsRes, chartsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getCharts(),
      ]);
      dispatch({
        type: 'FETCH_OK',
        payload: {
          stats: statsRes.data.stats,
          recentActivity: statsRes.data.recentActivity || [],
          warehouseBreakdown: statsRes.data.warehouseBreakdown || [],
          recentRequests: statsRes.data.recentRequests || [],
          charts: chartsRes.data,
        },
      });
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load dashboard';
      dispatch({ type: 'FETCH_ERR', error: msg });
      showToast(msg, 'error');
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Real-time polling: refresh every 30 seconds automatically ──
  useEffect(() => {
    const id = setInterval(() => {
      // Silent background refresh — don't show loading spinner
      Promise.all([dashboardAPI.getStats(), dashboardAPI.getCharts()])
        .then(([statsRes, chartsRes]) => {
          dispatch({
            type: 'FETCH_OK',
            payload: {
              stats: statsRes.data.stats,
              recentActivity: statsRes.data.recentActivity || [],
              warehouseBreakdown: statsRes.data.warehouseBreakdown || [],
              recentRequests: statsRes.data.recentRequests || [],
              charts: chartsRes.data,
            },
          });
          setLastUpdated(new Date());
        })
        .catch(() => {
          /* silent — don't disrupt UX on background poll failure */
        });
    }, 30_000); // every 30 s

    return () => clearInterval(id);
  }, []); // run once, no deps needed — uses stable API functions

  /* ── Quick-action: create PO for low stock item ── */
  const handleReorder = async (item) => {
    showToast(
      `Reorder for ${item.productName || item.sku} — open Purchase Orders to complete.`,
      'info',
    );
    navigate('/purchase-orders');
  };

  /* ── Requester dashboard ── */
  if (role === 'user') {
    return <RequesterDashboard state={state} navigate={navigate} onRefresh={fetchAll} />;
  }

  /* ── Admin / Manager / Staff ── */
  const { stats, charts, loading } = state;

  // Staff role: no financial ₹ value card; show warehouse-scoped operational cards only
  const kpiCards = role === 'staff'
    ? [
        {
          icon: <LowStockIcon />,
          label: 'Low Stock Items',
          value: loading ? '—' : fmtNum(stats?.lowStockCount),
          sub: stats?.lowStockCount > 0 ? 'Needs attention' : 'All healthy',
          variant: stats?.lowStockCount > 0 ? 'warning' : 'success',
        },
        {
          icon: <POIcon />,
          label: 'Pending Orders',
          value: loading ? '—' : fmtNum(stats?.pendingPurchaseOrders),
          sub: stats?.pendingPurchaseOrders > 0 ? 'Awaiting processing' : 'None pending',
          variant: stats?.pendingPurchaseOrders > 0 ? 'warning' : 'neutral',
        },
        {
          icon: <RequestIcon />,
          label: 'My Open Requests',
          value: loading ? '—' : fmtNum(stats?.openRequests),
          sub: stats?.openRequests > 0 ? 'Pending + approved' : 'Queue clear',
          variant: stats?.openRequests > 0 ? 'primary' : 'neutral',
        },
      ]
    : [
        {
          icon: <ValueIcon />,
          label: 'Total Stock Value',
          value: loading ? '—' : fmt(stats?.totalStockValue),
          sub: stats?.totalWarehouses ? `${stats.totalWarehouses} warehouses` : null,
          variant: 'success',
        },
        {
          icon: <LowStockIcon />,
          label: 'Low Stock Items',
          value: loading ? '—' : fmtNum(stats?.lowStockCount),
          sub: stats?.lowStockCount > 0 ? 'Needs attention' : 'All healthy',
          variant: stats?.lowStockCount > 0 ? 'warning' : 'success',
        },
        {
          icon: <POIcon />,
          label: 'Pending Orders',
          value: loading ? '—' : fmtNum(stats?.pendingPurchaseOrders),
          sub: stats?.pendingPurchaseOrders > 0 ? 'Awaiting approval' : 'None pending',
          variant: stats?.pendingPurchaseOrders > 0 ? 'warning' : 'neutral',
        },
        {
          icon: <RequestIcon />,
          label: 'Open Requests',
          value: loading ? '—' : fmtNum(stats?.openRequests),
          sub: stats?.openRequests > 0 ? 'Pending + approved' : 'Queue clear',
          variant: stats?.openRequests > 0 ? 'primary' : 'neutral',
        },
      ];

  /* Extra cards for admin */
  if (role === 'admin') {
    kpiCards.push(
      {
        icon: <StockIcon />,
        label: 'Total Products',
        value: loading ? '—' : fmtNum(stats?.totalProducts),
        variant: 'info',
      },
      {
        icon: <SupplierIcon />,
        label: 'Active Suppliers',
        value: loading ? '—' : fmtNum(stats?.totalSuppliers),
        variant: 'neutral',
      },
    );
  }

  /* Low-stock table columns */
  const lowStockCols = [
    { key: 'sku', label: 'SKU', width: 100, skeletonWidth: '80%' },
    { key: 'productName', label: 'Product', skeletonWidth: '70%' },
    { key: 'currentQty', label: 'Current Qty', align: 'center', width: 110 },
    { key: 'reorderLevel', label: 'Reorder Level', align: 'center', width: 120 },
    { key: 'actions', label: '', align: 'right', width: 100 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
            Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Real-time inventory and operations overview
            </p>
            {/* Live indicator dot */}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 0 2px rgba(16,185,129,0.25)',
                  animation: 'livePulse 2s ease-in-out infinite',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: '#000000',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Live
              </span>
            </span>
            {lastUpdated && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                · Updated{' '}
                {lastUpdated.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
        <Button
          variant='secondary'
          size='sm'
          leftIcon={<RefreshIcon style={{ fontSize: 16 }} />}
          onClick={() => {
            fetchAll();
            setLastUpdated(new Date());
          }}
          loading={loading}
        >
          Refresh
        </Button>
      </div>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {kpiCards.map((c, i) => (
          <KpiCard key={i} {...c} loading={loading} />
        ))}
      </div>

      {/* ── Charts row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        {/* Bar: Stock Value by Warehouse (admin only — managers see one warehouse) */}
        {role === 'admin' && (
        <Card title='Stock Value by Warehouse' style={{ minHeight: 320 }}>
          <Card.Body>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 240,
                }}
              >
                <Spinner size='lg' />
              </div>
            ) : (
              <ResponsiveContainer width='100%' height={240}>
                <BarChart
                  data={charts?.stockByWarehouse || []}
                  margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray='3 3' stroke='var(--color-border)' />
                  <XAxis dataKey='warehouseName' tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartTooltip
                    {...chartTooltipStyle}
                    formatter={(v) => [fmt(v), 'Stock Value']}
                  />
                  <Bar
                    dataKey='stockValue'
                    name='Stock Value'
                    fill='var(--color-primary)'
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card.Body>
        </Card>
        )}

        {/* Line: PO Trend */}
        <Card title='Purchase Orders — Last 7 Days' style={{ minHeight: 320 }}>
          <Card.Body>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 240,
                }}
              >
                <Spinner size='lg' />
              </div>
            ) : (
              <ResponsiveContainer width='100%' height={240}>
                <LineChart
                  data={charts?.purchaseOrderTrend || []}
                  margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray='3 3' stroke='var(--color-border)' />
                  <XAxis dataKey='label' tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <RechartTooltip {...chartTooltipStyle} formatter={(v) => [v, 'Orders']} />
                  <Line
                    type='monotone'
                    dataKey='count'
                    name='Orders'
                    stroke='var(--color-primary)'
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card.Body>
        </Card>

        {/* Pie: Request Status */}
        <Card title='Request Status Breakdown' style={{ minHeight: 320 }}>
          <Card.Body>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 240,
                }}
              >
                <Spinner size='lg' />
              </div>
            ) : (charts?.requestStatusBreakdown || []).length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 240,
                  gap: 8,
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <RequestIcon style={{ fontSize: 36, opacity: 0.3 }} />
                <span style={{ fontSize: 'var(--text-sm)' }}>No requests submitted yet</span>
              </div>
            ) : (
              <ResponsiveContainer width='100%' height={240}>
                <PieChart>
                  <Pie
                    data={charts?.requestStatusBreakdown || []}
                    dataKey='count'
                    nameKey='status'
                    cx='50%'
                    cy='46%'
                    outerRadius={85}
                    label={({ status, count }) => `${status} (${count})`}
                    labelLine={false}
                  >
                    {(charts?.requestStatusBreakdown || []).map((entry, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[entry.status] || PIE_FALLBACK[i % PIE_FALLBACK.length]}
                      />
                    ))}
                  </Pie>
                  <RechartTooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ── Bottom row: Low-stock table + Activity feed ── */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 16 }}
      >
        {/* Low-stock table */}
        <Card
          title='Top Low Stock Items'
          subtitle='Products approaching or below reorder level'
          action={
            <Button variant='ghost' size='sm' onClick={() => navigate('/inventory')}>
              View All
            </Button>
          }
          padding={false}
        >
          <Table
            columns={lowStockCols}
            data={charts?.topLowStockItems || []}
            loading={loading}
            emptyText='No low stock items — all products are well stocked.'
            renderRow={(item, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {item.sku}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 600 }}>{item.productName}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <Badge variant={item.currentQty === 0 ? 'danger' : 'warning'} size='sm'>
                    {item.currentQty}
                  </Badge>
                </td>
                <td
                  style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-secondary)' }}
                >
                  {item.reorderLevel}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {(role === 'admin' || role === 'manager') && (
                    <Button variant='secondary' size='sm' onClick={() => handleReorder(item)}>
                      Reorder
                    </Button>
                  )}
                </td>
              </tr>
            )}
          />
        </Card>

        {/* Activity feed */}
        <Card title='Recent Activity' subtitle='Last 10 system events'>
          <Card.Body padding={false}>
            {loading ? (
              <div style={{ padding: 20 }}>
                <ActivitySkeleton />
              </div>
            ) : state.recentActivity.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                No activity recorded yet.
              </div>
            ) : (
              <ul style={{ margin: 0, padding: '8px 0', listStyle: 'none' }}>
                {state.recentActivity.map((log, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 20px',
                      borderBottom:
                        i < state.recentActivity.length - 1
                          ? '1px solid var(--color-border)'
                          : 'none',
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--color-surface-alt)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {activityIcon(log.action)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 'var(--text-sm)',
                          fontWeight: 500,
                          color: 'var(--color-text-primary)',
                          fontFamily: 'var(--font-sans)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatAction(log.action)}
                        {log.tableName && (
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                            {' '}
                            <span
                              style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
                            >
                              {log.tableName}
                            </span>
                          </span>
                        )}
                      </p>
                      <div
                        style={{
                          marginTop: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-muted)',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <span>{log.user}</span>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>{relativeTime(log.timestamp)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ── Warehouse breakdown (admin only, full-width) ── */}
      {role === 'admin' && !loading && state.warehouseBreakdown.length > 0 && (
        <Card
          title='Warehouse Breakdown'
          subtitle='Stock distribution across all warehouses'
          action={
            <Button variant='ghost' size='sm' onClick={() => navigate('/warehouses')}>
              Manage
            </Button>
          }
          padding={false}
        >
          <Table
            columns={[
              { key: 'name', label: 'Warehouse' },
              { key: 'qty', label: 'Total Qty', align: 'right', width: 120 },
              { key: 'value', label: 'Stock Value', align: 'right', width: 150 },
              { key: 'products', label: 'Unique Products', align: 'right', width: 140 },
            ]}
            data={state.warehouseBreakdown}
            loading={false}
            emptyText='No warehouses found.'
            renderRow={(row, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 600 }}>{row.warehouseName}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {fmtNum(row.totalQty)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {fmt(row.stockValue)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <Badge variant='neutral' size='sm'>
                    {row.uniqueProducts}
                  </Badge>
                </td>
              </tr>
            )}
          />
        </Card>
      )}
    </div>
  );
}

/* ── Requester dashboard variant ───────────────────────────── */
function RequesterDashboard({ state, navigate, onRefresh }) {
  const { stats, charts, recentRequests, loading } = state;

  const kpiCards = [
    {
      icon: <PendingIcon />,
      label: 'Pending Approval',
      value: loading ? '—' : fmtNum(stats?.pending),
      variant: 'warning',
      sub: 'Awaiting review',
    },
    {
      icon: <CheckIcon />,
      label: 'Approved',
      value: loading ? '—' : fmtNum(stats?.approved),
      variant: 'primary',
      sub: 'Ready to fulfill',
    },
    {
      icon: <FulfilledIcon />,
      label: 'Fulfilled',
      value: loading ? '—' : fmtNum(stats?.fulfilled),
      variant: 'success',
      sub: 'Completed',
    },
  ];

  const reqCols = [
    { key: 'number', label: 'Request #', width: 140 },
    { key: 'purpose', label: 'Purpose' },
    { key: 'status', label: 'Status', align: 'center', width: 110 },
    { key: 'date', label: 'Date', align: 'right', width: 130 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
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
            My Dashboard
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Track your inventory requests
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant='primary'
            size='sm'
            leftIcon={<OpenIcon style={{ fontSize: 16 }} />}
            onClick={() => navigate('/user/catalog')}
          >
            Browse Catalog
          </Button>
          <Button
            variant='secondary'
            size='sm'
            leftIcon={<RefreshIcon style={{ fontSize: 16 }} />}
            onClick={onRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        {kpiCards.map((c, i) => (
          <KpiCard key={i} {...c} loading={loading} />
        ))}
      </div>

      {/* Request breakdown pie + recent requests table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: 16 }}>
        <Card title='Request Breakdown'>
          <Card.Body>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 200,
                }}
              >
                <Spinner size='lg' />
              </div>
            ) : (
              <ResponsiveContainer width='100%' height={200}>
                <PieChart>
                  <Pie
                    data={charts?.requestStatusBreakdown || []}
                    dataKey='count'
                    nameKey='status'
                    cx='50%'
                    cy='46%'
                    outerRadius={72}
                    label={({ status, count }) => `${status} (${count})`}
                    labelLine={false}
                  >
                    {(charts?.requestStatusBreakdown || []).map((entry, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[entry.status] || PIE_FALLBACK[i % PIE_FALLBACK.length]}
                      />
                    ))}
                  </Pie>
                  <RechartTooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card.Body>
        </Card>

        <Card
          title='My Recent Requests'
          action={
            <Button variant='ghost' size='sm' onClick={() => navigate('/user/my-requests')}>
              View All
            </Button>
          }
          padding={false}
        >
          <Table
            columns={reqCols}
            data={recentRequests}
            loading={loading}
            emptyText='No requests yet. Browse the catalog to submit your first request.'
            renderRow={(req, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                    }}
                  >
                    {req.request_number}
                  </span>
                </td>
                <td
                  style={{
                    ...tdStyle,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {req.purpose}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <Badge variant={statusBadgeVariant(req.status)} size='sm'>
                    {req.status}
                  </Badge>
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: 'right',
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {new Date(req.created_at).toLocaleDateString()}
                </td>
              </tr>
            )}
          />
        </Card>
      </div>
    </div>
  );
}

/* ── Shared table cell style ─────────────────────────────────── */
const tdStyle = {
  padding: '11px 16px',
  fontSize: 'var(--text-base)',
  color: 'var(--color-text-primary)',
  borderBottom: '1px solid var(--color-border)',
  verticalAlign: 'middle',
  fontFamily: 'var(--font-sans)',
};

/* ── Format action string for display ───────────────────────── */
function formatAction(action = '') {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
