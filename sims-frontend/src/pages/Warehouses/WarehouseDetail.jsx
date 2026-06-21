import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowBack as BackIcon,
  EditOutlined as EditIcon,
  PersonOutline as PersonIcon,
  LocationOn as LocationIcon,
  BarChart as StatsIcon,
  Inventory2 as InvIcon,
  ShoppingCart as POIcon,
  History as ActivityIcon,
  WarningAmberOutlined as WarnIcon,
} from '@mui/icons-material';
import { warehouseAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import InventoryList from '../Inventory/InventoryList';
import { SlideDrawer } from '../Products/ProductList';
import WarehouseForm from './WarehouseForm';

/* ── helpers ─────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── reducer ─────────────────────────────────────────────────── */
const INIT = { data: null, loading: true, error: null, stats: null };
function reducer(s, a) {
  switch (a.type) {
    case 'START':
      return { ...s, loading: true, error: null };
    case 'OK':
      return { loading: false, error: null, data: a.data, stats: a.stats };
    case 'ERROR':
      return { ...s, loading: false, error: a.error };
    default:
      return s;
  }
}

const TABS = [
  { id: 'inventory', label: 'Inventory', icon: InvIcon },
  { id: 'activity', label: 'Recent Activity', icon: ActivityIcon },
];

/* ══════════════════════════════════════════════════════════════
   WarehouseDetail
══════════════════════════════════════════════════════════════ */
export default function WarehouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((s) => s.auth);
  const isAdmin = user?.role === 'admin';

  const [state, dispatch] = useReducer(reducer, INIT);
  const [tab, setTab] = useState('inventory');
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    dispatch({ type: 'START' });
    try {
      const [detailRes, statsRes] = await Promise.all([
        warehouseAPI.getById(id),
        warehouseAPI.getStats(id),
      ]);
      dispatch({ type: 'OK', data: detailRes.data.data, stats: statsRes.data.data });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load warehouse';
      dispatch({ type: 'ERROR', error: msg });
      showToast(msg, 'error');
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { data: wh, stats, loading, error } = state;

  if (loading)
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}
      >
        <Spinner size='lg' />
      </div>
    );

  if (error || !wh)
    return (
      <div style={{ textAlign: 'center', padding: 48, fontFamily: 'var(--font-sans)' }}>
        <WarnIcon style={{ fontSize: 48, color: 'var(--color-warning)', marginBottom: 12 }} />
        <h2 style={{ margin: '0 0 8px', color: 'var(--color-text-primary)' }}>
          {error?.includes('Access denied') ? 'Access Denied' : 'Warehouse not found'}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{error}</p>
        <Button variant='secondary' onClick={() => navigate('/warehouses')}>
          <BackIcon style={{ fontSize: 16 }} /> Back
        </Button>
      </div>
    );

  const usagePct = stats?.usage_percent
    ? Number(stats.usage_percent)
    : Number(wh.capacity) > 0
      ? (Number(wh.current_usage) / Number(wh.capacity)) * 100
      : 0;
  const barColor =
    usagePct >= 90
      ? 'var(--color-danger)'
      : usagePct >= 70
        ? 'var(--color-warning)'
        : 'var(--color-success)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate('/warehouses')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-sans)',
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          <BackIcon style={{ fontSize: 16 }} /> Warehouses
        </button>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>/</span>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {wh.name}
        </span>
      </div>

      {/* ── Header card ── */}
      <Card>
        <Card.Body>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-primary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <InvIcon style={{ fontSize: 32, color: 'var(--color-primary)' }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {wh.name}
                </h1>
                {wh.code && <Badge variant='neutral'>{wh.code}</Badge>}
                <Badge variant={wh.status === 'active' ? 'success' : 'neutral'}>{wh.status}</Badge>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <LocationIcon style={{ fontSize: 14 }} />
                  {[wh.city, wh.location, wh.country].filter(Boolean).join(', ')}
                </span>
                {wh.manager_name && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <PersonIcon style={{ fontSize: 14 }} /> {wh.manager_name}
                  </span>
                )}
              </div>

              {/* Capacity bar */}
              <div style={{ marginTop: 14, maxWidth: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Capacity Used
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      color: barColor,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {usagePct.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: 'var(--color-surface-alt)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${usagePct}%`,
                      borderRadius: 999,
                      background: barColor,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {fmtNum(wh.current_usage)} used
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {fmtNum(wh.capacity)} total
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <Button
                variant='secondary'
                size='sm'
                leftIcon={<EditIcon style={{ fontSize: 16 }} />}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
            )}
          </div>

          {/* Stats row */}
          {stats && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <StatPill label='Products' value={fmtNum(stats.uniqueProducts)} variant='primary' />
              <StatPill label='Stock Value' value={fmt(stats.stockValue)} variant='success' />
              <StatPill
                label='Low Stock'
                value={fmtNum(stats.lowStock)}
                variant={stats.lowStock > 0 ? 'warning' : 'neutral'}
              />
              <StatPill
                label='Out of Stock'
                value={fmtNum(stats.outOfStock)}
                variant={stats.outOfStock > 0 ? 'danger' : 'neutral'}
              />
              <StatPill
                label='Active POs'
                value={fmtNum(stats.activePOs)}
                variant={stats.activePOs > 0 ? 'info' : 'neutral'}
              />
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)' }}>
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 18px',
              fontSize: 'var(--text-sm)',
              fontWeight: tab === tid ? 700 : 500,
              fontFamily: 'var(--font-sans)',
              color: tab === tid ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: `2px solid ${tab === tid ? 'var(--color-primary)' : 'transparent'}`,
              marginBottom: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon style={{ fontSize: 15 }} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab panels ── */}
      {tab === 'inventory' && <InventoryList warehouseId={id} />}

      {tab === 'activity' && (
        <Card title='Recent Activity' subtitle='Latest inventory and warehouse events'>
          <Card.Body padding={false}>
            {!stats?.recentActivity?.length ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                No recent activity.
              </div>
            ) : (
              <ul style={{ margin: 0, padding: '8px 0', listStyle: 'none' }}>
                {stats.recentActivity.map((log, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '10px 20px',
                      borderBottom:
                        i < stats.recentActivity.length - 1
                          ? '1px solid var(--color-border)'
                          : 'none',
                    }}
                  >
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
                      <ActivityIcon style={{ fontSize: 14, color: 'var(--color-text-muted)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-primary)',
                            fontFamily: 'var(--font-sans)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {log.action.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          by {log.user}
                        </span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-sans)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {relTime(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
      )}

      {/* ── Edit drawer ── */}
      <SlideDrawer open={editOpen} onClose={() => setEditOpen(false)}>
        <WarehouseForm
          warehouse={wh}
          onSuccess={(msg) => {
            setEditOpen(false);
            showToast(msg, 'success');
            fetchData();
          }}
          onCancel={() => setEditOpen(false)}
        />
      </SlideDrawer>
    </div>
  );
}

function StatPill({ label, value, variant = 'neutral' }) {
  const softMap = {
    primary: 'var(--color-primary-soft)',
    success: 'var(--color-success-soft)',
    warning: 'var(--color-warning-soft)',
    danger: 'var(--color-danger-soft)',
    info: 'var(--color-info-soft)',
    neutral: 'var(--color-surface-alt)',
  };
  const colorMap = {
    primary: 'var(--color-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)',
    neutral: 'var(--color-text-secondary)',
  };
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: softMap[variant],
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: '0 0 2px',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-xl)',
          fontWeight: 800,
          color: colorMap[variant],
          fontFamily: 'var(--font-sans)',
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}
