import React, {
  useCallback, useEffect, useReducer, useRef, useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Search as SearchIcon,
  Add as AddIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  FilterList as FilterIcon,
  Inventory2Outlined as EmptyIcon,
  WarningAmberOutlined as WarnIcon,
} from '@mui/icons-material';
import { productAPI, categoryAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import ProductForm from './ProductForm';

/* ── constants ───────────────────────────────────────────────── */
const LIMITS = [10, 25, 50];

/* ── reducer ─────────────────────────────────────────────────── */
const INIT = {
  products: [], total: 0, page: 1, totalPages: 1, loading: true,
};
function reducer(s, a) {
  switch (a.type) {
    case 'LOAD_START': return { ...s, loading: true };
    case 'LOAD_OK':    return { ...s, loading: false, ...a.payload };
    case 'LOAD_ERR':   return { ...s, loading: false };
    default:           return s;
  }
}

/* ── helpers ─────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(n || 0);

function stockBadge(status, qty) {
  if (status === 'out_of_stock') return <Badge variant="danger"  dot>Out of Stock ({qty})</Badge>;
  if (status === 'low_stock')    return <Badge variant="warning" dot>Low Stock ({qty})</Badge>;
  return                                <Badge variant="success" dot>In Stock ({qty})</Badge>;
}

function statusBadge(isActive) {
  return isActive
    ? <Badge variant="success">Active</Badge>
    : <Badge variant="neutral">Inactive</Badge>;
}

/* ══════════════════════════════════════════════════════════════
   ProductList
══════════════════════════════════════════════════════════════ */
export default function ProductList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((s) => s.auth);
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin          = user?.role === 'admin';

  const [state, dispatch] = useReducer(reducer, INIT);
  const [categories, setCategories]     = useState([]);
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [categoryFilter, setCatFilter]  = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [limit, setLimit]               = useState(10);
  const [page, setPage]                 = useState(1);

  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editProduct, setEditProduct]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const debounceRef = useRef(null);

  /* Debounce search */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 320);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  /* Fetch products */
  const fetchProducts = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const res = await productAPI.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        category: categoryFilter  || undefined,
        status: statusFilter      || undefined,
      });
      const d = res.data.data;
      dispatch({
        type: 'LOAD_OK',
        payload: {
          products:   d.products,
          total:      d.total,
          page:       d.page,
          totalPages: d.totalPages,
        },
      });
    } catch (err) {
      dispatch({ type: 'LOAD_ERR' });
      showToast(err.response?.data?.error || 'Failed to load products', 'error');
    }
  }, [page, limit, debouncedSearch, categoryFilter, statusFilter, showToast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* Fetch categories once */
  useEffect(() => {
    categoryAPI.getAll()
      .then((r) => setCategories(r.data.data || []))
      .catch(() => {});
  }, []);

  /* Handlers */
  const openAdd = () => { setEditProduct(null); setDrawerOpen(true); };
  const openEdit = (p, e) => { e.stopPropagation(); setEditProduct(p); setDrawerOpen(true); };
  const handleFormSuccess = (msg) => {
    setDrawerOpen(false);
    showToast(msg, 'success');
    fetchProducts();
    // Refresh categories in case a new one was added
    categoryAPI.getAll().then((r) => setCategories(r.data.data || [])).catch(() => {});
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await productAPI.delete(deleteTarget.product_id);
      showToast(`"${deleteTarget.name}" deactivated`, 'success');
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  /* Table columns */
  const columns = [
    { key: 'image',    label: '',              width: 48 },
    { key: 'name',     label: 'Product',       sortable: false },
    { key: 'sku',      label: 'SKU',           width: 120 },
    { key: 'barcode',  label: 'Barcode',       width: 140 },
    { key: 'category', label: 'Category',      width: 130 },
    { key: 'stock',    label: 'Stock',         width: 150,  align: 'center' },
    { key: 'reorder',  label: 'Reorder Lvl',  width: 110,  align: 'center' },
    { key: 'price',    label: 'Price',         width: 120,  align: 'right' },
    { key: 'status',   label: 'Status',        width: 100,  align: 'center' },
    ...(isAdminOrManager
      ? [{ key: 'actions', label: '', width: 88, align: 'right' }]
      : []),
  ];

  const tdStyle = {
    padding: '10px 16px',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-primary)',
  };

  const { products, total, totalPages, loading } = state;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
            Products
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {total} products in catalogue
          </p>
        </div>
        {isAdminOrManager && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<AddIcon style={{ fontSize: 18 }} />}
            onClick={openAdd}
          >
            Add Product
          </Button>
        )}
      </div>

      {/* ── Toolbar ── */}
      <Card padding={false}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          alignItems: 'flex-end',
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 220px', minWidth: 180 }}>
            <Input
              placeholder="Search name, SKU, barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon style={{ fontSize: 16 }} />}
            />
          </div>

          {/* Category filter */}
          <div style={{ flex: '0 0 160px' }}>
            <Select
              value={categoryFilter}
              onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </Select>
          </div>

          {/* Status filter */}
          <div style={{ flex: '0 0 140px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Status</option>
            </Select>
          </div>

          {/* Per-page */}
          <div style={{ flex: '0 0 100px' }}>
            <Select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {LIMITS.map((l) => (
                <option key={l} value={l}>{l} / page</option>
              ))}
            </Select>
          </div>
        </div>

        {/* ── Table ── */}
        <Table
          columns={columns}
          data={products}
          loading={loading}
          emptyText="No products found. Try adjusting your filters."
          emptyIcon={<EmptyIcon />}
          renderRow={(p, i) => (
            <tr
              key={p.product_id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/products/${p.product_id}`)}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              {/* Image */}
              <td style={{ ...tdStyle, padding: '8px 12px' }}>
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <EmptyIcon style={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                  }
                </div>
              </td>

              {/* Name + description */}
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                {p.description && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 1, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description}
                  </div>
                )}
              </td>

              {/* SKU */}
              <td style={tdStyle}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-surface-alt)', padding: '2px 6px', borderRadius: 4 }}>
                  {p.sku}
                </span>
              </td>

              {/* Barcode */}
              <td style={tdStyle}>
                {p.barcode ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#047857', background: '#d1fae5', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
                    {p.barcode}
                  </span>
                ) : (
                  <Badge variant="warning" size="sm">No barcode</Badge>
                )}
              </td>

              {/* Category */}
              <td style={tdStyle}>
                <Badge variant="neutral" size="sm">{p.category}</Badge>
              </td>

              {/* Stock */}
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {stockBadge(p.stockStatus, p.totalStock)}
              </td>

              {/* Reorder level */}
              <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                {p.reorder_level}
              </td>

              {/* Price */}
              <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {fmt(p.unit_price)}
              </td>

              {/* Status */}
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {statusBadge(p.is_active)}
              </td>

              {/* Actions */}
              {isAdminOrManager && (
                <td style={{ ...tdStyle, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <ActionBtn title="Edit" onClick={(e) => openEdit(p, e)}>
                      <EditIcon style={{ fontSize: 16 }} />
                    </ActionBtn>
                    {isAdmin && (
                      <ActionBtn title="Deactivate" danger onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}>
                        <DeleteIcon style={{ fontSize: 16 }} />
                      </ActionBtn>
                    )}
                  </div>
                </td>
              )}
            </tr>
          )}
        />

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</Button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const n = start + i;
                return n <= totalPages ? (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      width: 32, height: 32,
                      border: `1px solid ${n === page ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: n === page ? 'var(--color-primary)' : 'transparent',
                      color: n === page ? '#fff' : 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ) : null;
              })}

              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Add / Edit Drawer ── */}
      <SlideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <ProductForm
          product={editProduct}
          categories={categories}
          onSuccess={handleFormSuccess}
          onCancel={() => setDrawerOpen(false)}
          onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat].sort((a,b) => a.name.localeCompare(b.name)))}
        />
      </SlideDrawer>

      {/* ── Delete confirm modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Deactivate Product"
        size="sm"
      >
        <Modal.Body>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--color-danger-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <WarnIcon style={{ color: 'var(--color-danger)', fontSize: 22 }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
                Deactivate "{deleteTarget?.name}"?
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                This is a soft delete — the product will be hidden from active lists but its inventory and order history will be preserved.
              </p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" size="sm" loading={deleteLoading} onClick={confirmDelete}>
            Deactivate
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────────── */
function ActionBtn({ children, onClick, danger = false, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30,
        border: `1px solid ${danger ? 'var(--color-danger)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        background: 'transparent',
        color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background var(--transition-base)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'var(--color-danger-soft)' : 'var(--color-surface-alt)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

/* ── Slide-over Drawer (exported so ProductDetail can reuse it) ── */
export function SlideDrawer({ open, onClose, children }) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(2px)',
            animation: 'fade-in 0.2s ease',
          }}
        />
      )}
      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1300,
          width: '100%', maxWidth: 520,
          background: 'var(--color-surface)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform var(--transition-slow)',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}
