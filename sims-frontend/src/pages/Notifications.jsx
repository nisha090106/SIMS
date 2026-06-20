import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  NotificationsNone as BellIcon,
  DoneAll as DoneAllIcon,
  DeleteSweep as ClearIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
  deleteNotification,
  resetList,
} from '../store/notificationsSlice';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';

/* ── helpers ─────────────────────────────────────────────────── */
function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TYPE_COLOR = {
  po_created:          '#3b82f6',
  po_submitted:        '#0891b2',
  po_approved:         '#16a34a',
  po_shipped:          '#d97706',
  po_received:         '#16a34a',
  po_cancelled:        '#dc2626',
  po_auto_drafted:     '#7c3aed',
  request_created:     '#0891b2',
  request_approved:    '#16a34a',
  request_rejected:    '#dc2626',
  request_fulfilled:   '#059669',
  request_cancelled:   '#64748b',
  low_stock_auto_po:   '#d97706',
  nightly_sync_summary:'#6366f1',
};

const TYPE_VARIANT = {
  po_approved: 'success', po_received: 'success', request_approved: 'success',
  request_fulfilled: 'success',
  po_cancelled: 'danger', request_rejected: 'danger',
  po_shipped: 'warning', low_stock_auto_po: 'warning', po_submitted: 'info',
  request_created: 'info', po_created: 'primary',
  nightly_sync_summary: 'neutral',
};

const ALL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'po_created',          label: 'PO Created' },
  { value: 'po_submitted',        label: 'PO Submitted' },
  { value: 'po_approved',         label: 'PO Approved' },
  { value: 'po_shipped',          label: 'PO Shipped' },
  { value: 'po_received',         label: 'PO Received' },
  { value: 'po_cancelled',        label: 'PO Cancelled' },
  { value: 'request_created',     label: 'Request Created' },
  { value: 'request_approved',    label: 'Request Approved' },
  { value: 'request_rejected',    label: 'Request Rejected' },
  { value: 'request_fulfilled',   label: 'Request Fulfilled' },
  { value: 'low_stock_auto_po',   label: 'Low Stock Alert' },
  { value: 'nightly_sync_summary',label: 'Nightly Sync' },
];

const PAGE_SIZE = 20;

/* ══════════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════════ */
export default function Notifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, total, pages, page, loading, unreadCount } = useSelector(s => s.notifications);

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  // filtered client-side
  const displayed = list.filter(n => {
    if (unreadOnly && n.is_read) return false;
    if (typeFilter && n.type !== typeFilter) return false;
    return true;
  });

  const load = useCallback((pg = 1) => {
    dispatch(fetchNotifications({ page: pg, limit: PAGE_SIZE, unread_only: false }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(resetList());
    load(1);
  }, [load]);

  const handleLoadMore = () => load(page + 1);

  const handleMarkAll  = () => dispatch(markAllNotificationsRead());
  const handleClear    = () => dispatch(clearReadNotifications());
  const handleRead     = (n) => {
    if (!n.is_read) dispatch(markNotificationRead(n.id));
    if (n.link) navigate(n.link);
  };
  const handleDelete   = (e, id) => { e.stopPropagation(); dispatch(deleteNotification(id)); };

  const unreadInList = displayed.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
            Notifications
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {total} total · {unreadCount} unread
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" leftIcon={<DoneAllIcon style={{ fontSize: 16 }} />} onClick={handleMarkAll}>
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" leftIcon={<ClearIcon style={{ fontSize: 16 }} />} onClick={handleClear}>
            Clear read
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<RefreshIcon style={{ fontSize: 16 }} />} onClick={() => { dispatch(resetList()); load(1); }} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 12, padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <FilterIcon style={{ fontSize: 18, color: 'var(--color-text-muted)' }} />
        <div style={{ flex: '0 0 200px' }}>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {ALL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500, color: 'var(--color-text-primary)', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={e => setUnreadOnly(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
          Unread only
          {unreadInList > 0 && (
            <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
              {unreadInList}
            </span>
          )}
        </label>
      </div>

      {/* List */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {loading && displayed.length === 0 ? (
          <LoadingSkeleton />
        ) : displayed.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {displayed.map((n, i) => (
              <NotificationItem
                key={n.id}
                n={n}
                isLast={i === displayed.length - 1}
                onClick={() => handleRead(n)}
                onDelete={e => handleDelete(e, n.id)}
              />
            ))}
            {/* Load more */}
            {page < pages && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                <Button variant="secondary" size="sm" onClick={handleLoadMore} loading={loading}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

/* ── Notification row ────────────────────────────────────────── */
function NotificationItem({ n, isLast, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const color = TYPE_COLOR[n.type] || '#64748b';
  const variant = TYPE_VARIANT[n.type] || 'neutral';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', gap: 14,
        padding: '14px 20px',
        cursor: n.link ? 'pointer' : 'default',
        background: hovered
          ? 'var(--color-surface-alt)'
          : (!n.is_read ? `rgba(37,99,235,0.035)` : 'transparent'),
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        transition: 'background 0.1s',
        position: 'relative',
      }}
    >
      {/* Unread indicator bar */}
      {!n.is_read && (
        <span style={{
          position: 'absolute', top: 0, left: 0,
          width: 3, height: '100%',
          background: 'var(--color-primary)',
          borderRadius: '3px 0 0 3px',
        }} />
      )}

      {/* Icon blob */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, marginTop: 2,
      }}>
        {n.title?.slice(0, 2) || '🔔'}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <p style={{
            margin: 0, fontSize: 13,
            fontWeight: n.is_read ? 500 : 700,
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)',
            lineHeight: 1.4,
          }}>
            {n.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Badge variant={variant} size="sm" style={{ textTransform: 'none', fontSize: 10 }}>
              {n.type.replace(/_/g, ' ')}
            </Badge>
            {!n.is_read && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
            )}
          </div>
        </div>

        <p style={{
          margin: '3px 0 0', fontSize: 13,
          color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)',
          lineHeight: 1.5,
        }}>
          {n.message}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>
            {fmtDate(n.created_at)}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>·</span>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>
            {relativeTime(n.created_at)}
          </span>
          {n.link && (
            <>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                View →
              </span>
            </>
          )}
        </div>
      </div>

      {/* Delete */}
      {hovered && (
        <button
          onClick={onDelete}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: 16, lineHeight: 1,
            padding: '4px 6px', borderRadius: 6, alignSelf: 'flex-start',
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          title="Delete notification"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '0' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: i < 5 ? '1px solid var(--color-border)' : 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 13, borderRadius: 4, background: '#f1f5f9', width: '40%', marginBottom: 8 }} />
            <div style={{ height: 12, borderRadius: 4, background: '#f1f5f9', width: '70%', marginBottom: 6 }} />
            <div style={{ height: 10, borderRadius: 4, background: '#f1f5f9', width: '25%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <BellIcon style={{ fontSize: 48, color: 'var(--color-border)', display: 'block', margin: '0 auto 12px' }} />
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
        No notifications
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
        You're all caught up. Notifications appear here when there's activity.
      </p>
    </div>
  );
}
