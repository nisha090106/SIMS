import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Add as AddIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  Warehouse as WHIcon,
  WarningAmberOutlined as WarnIcon,
  OpenInNew as ViewIcon,
} from '@mui/icons-material';
import { warehouseAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import WarehouseForm from './WarehouseForm';
import { SlideDrawer } from '../Products/ProductList';

/* ── helpers ─────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

function usagePct(w) {
  const cap = Number(w.capacity);
  const use = Number(w.current_usage);
  return cap > 0 ? Math.min(100, (use / cap) * 100) : 0;
}

function capacityColor(pct) {
  if (pct >= 90) return 'var(--color-danger)';
  if (pct >= 70) return 'var(--color-warning)';
  return 'var(--color-success)';
}

/* ── reducer ─────────────────────────────────────────────────── */
const INIT = { warehouses: [], loading: true };
function reducer(s, a) {
  switch (a.type) {
    case 'START':
      return { ...s, loading: true };
    case 'OK':
      return { loading: false, warehouses: a.data };
    case 'ERR':
      return { ...s, loading: false };
    default:
      return s;
  }
}

/* ══════════════════════════════════════════════════════════════
   WarehouseList
══════════════════════════════════════════════════════════════ */
export default function WarehouseList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((s) => s.auth);
  const isAdmin = user?.role === 'admin';

  const [state, dispatch] = useReducer(reducer, INIT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    dispatch({ type: 'START' });
    try {
      const res = await warehouseAPI.getAll();
      dispatch({ type: 'OK', data: res.data.data || [] });
    } catch (err) {
      dispatch({ type: 'ERR' });
      showToast(err.response?.data?.error || 'Failed to load warehouses', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Non-admin: redirect to their own warehouse detail
  useEffect(() => {
    if (!isAdmin && state.warehouses.length === 1) {
      navigate(`/warehouses/${state.warehouses[0].warehouse_id}`, { replace: true });
    }
  }, [isAdmin, state.warehouses, navigate]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await warehouseAPI.delete(deleteTarget.warehouse_id);
      showToast(`"${deleteTarget.name}" deactivated`, 'success');
      setDeleteTarget(null);
      fetchWarehouses();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const { warehouses, loading } = state;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Spinner size='lg' />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
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
            Warehouses
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {warehouses.length} warehouses
          </p>
        </div>
        {isAdmin && (
          <Button
            variant='primary'
            size='sm'
            leftIcon={<AddIcon style={{ fontSize: 18 }} />}
            onClick={() => {
              setEditTarget(null);
              setDrawerOpen(true);
            }}
          >
            Add Warehouse
          </Button>
        )}
      </div>

      {/* ── Card grid ── */}
      {warehouses.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <WHIcon style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
          <p>No warehouses found.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {warehouses.map((w) => (
            <WarehouseCard
              key={w.warehouse_id}
              w={w}
              isAdmin={isAdmin}
              navigate={navigate}
              onEdit={() => {
                setEditTarget(w);
                setDrawerOpen(true);
              }}
              onDelete={() => setDeleteTarget(w)}
            />
          ))}
        </div>
      )}

      {/* ── Drawer ── */}
      <SlideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <WarehouseForm
          warehouse={editTarget}
          onSuccess={(msg) => {
            setDrawerOpen(false);
            showToast(msg, 'success');
            fetchWarehouses();
          }}
          onCancel={() => setDrawerOpen(false)}
        />
      </SlideDrawer>

      {/* ── Delete confirm ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='Deactivate Warehouse'
        size='sm'
      >
        <Modal.Body>
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
                Deactivate "{deleteTarget?.name}"?
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
                The warehouse will be set to inactive. Any remaining stock must be transferred
                first.
              </p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' size='sm' onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant='danger' size='sm' loading={deleteLoading} onClick={confirmDelete}>
            Deactivate
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

/* ── Warehouse Card ──────────────────────────────────────────── */
function WarehouseCard({ w, isAdmin, navigate, onEdit, onDelete }) {
  const pct = usagePct(w);
  const color = capacityColor(pct);

  return (
    <Card>
      <Card.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-lg)',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 180,
                  }}
                >
                  {w.name}
                </h3>
                {w.code && (
                  <Badge variant='neutral' size='sm'>
                    {w.code}
                  </Badge>
                )}
              </div>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {[w.city, w.location].filter(Boolean).join(' · ')}
              </p>
            </div>
            <Badge variant={w.status === 'active' ? 'success' : 'neutral'} size='sm'>
              {w.status}
            </Badge>
          </div>

          {/* Capacity bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                }}
              >
                Capacity Used
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {pct.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: 'var(--color-surface-alt)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 999,
                  background: color,
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
                {Number(w.current_usage).toLocaleString()} used
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {Number(w.capacity).toLocaleString()} total
              </span>
            </div>
          </div>

          {/* Manager */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {(w.manager_name || 'U').charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {w.manager_name || 'Unassigned'}
            </span>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              paddingTop: 4,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <Button
              variant='secondary'
              size='sm'
              fullWidth
              leftIcon={<ViewIcon style={{ fontSize: 15 }} />}
              onClick={() => navigate(`/warehouses/${w.warehouse_id}`)}
            >
              View Details
            </Button>
            {isAdmin && (
              <>
                <button
                  onClick={onEdit}
                  title='Edit'
                  style={{
                    width: 32,
                    height: 32,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface-alt)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <EditIcon style={{ fontSize: 16 }} />
                </button>
                <button
                  onClick={onDelete}
                  title='Deactivate'
                  style={{
                    width: 32,
                    height: 32,
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-danger)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-danger-soft)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <DeleteIcon style={{ fontSize: 16 }} />
                </button>
              </>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
