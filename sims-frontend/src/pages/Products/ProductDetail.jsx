import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowBack as BackIcon,
  EditOutlined as EditIcon,
  Inventory2Outlined as ProductIcon,
  QrCode2 as BarcodeIcon,
  Warehouse as WarehouseIcon,
  ShoppingCart as POIcon,
  History as AuditIcon,
  InfoOutlined as InfoIcon,
  WarningAmberOutlined as WarnIcon,
  CheckCircleOutline as OkIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { productAPI, categoryAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';
import ProductForm from './ProductForm';
import { SlideDrawer } from './ProductList';

/* ── helpers ─────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

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

function actionIcon(action = '') {
  const a = action.toUpperCase();
  if (a === 'CREATE') return <OkIcon style={{ fontSize: 14, color: 'var(--color-success)' }} />;
  if (a === 'UPDATE') return <InfoIcon style={{ fontSize: 14, color: 'var(--color-primary)' }} />;
  if (a === 'DELETE') return <ErrorIcon style={{ fontSize: 14, color: 'var(--color-danger)' }} />;
  return <InfoIcon style={{ fontSize: 14, color: 'var(--color-text-muted)' }} />;
}

function stockVariant(qty, reorder) {
  if (qty === 0) return 'danger';
  if (qty <= reorder) return 'warning';
  return 'success';
}

/* ── reducer ─────────────────────────────────────────────────── */
const INIT = { product: null, loading: true, error: null };
function reducer(s, a) {
  switch (a.type) {
    case 'START':
      return { ...s, loading: true, error: null };
    case 'OK':
      return { loading: false, error: null, product: a.product };
    case 'ERROR':
      return { ...s, loading: false, error: a.error };
    default:
      return s;
  }
}

/* ── Tab bar ─────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: InfoIcon },
  { id: 'inventory', label: 'Inventory', icon: WarehouseIcon },
  { id: 'purchases', label: 'Purchase History', icon: POIcon },
  { id: 'audit', label: 'Audit Log', icon: AuditIcon },
];

/* ══════════════════════════════════════════════════════════════
   ProductDetail
══════════════════════════════════════════════════════════════ */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((s) => s.auth);
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [state, dispatch] = useReducer(reducer, INIT);
  const [tab, setTab] = useState('overview');
  const [categories, setCategories] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  const fetchProduct = useCallback(async () => {
    dispatch({ type: 'START' });
    try {
      const res = await productAPI.getById(id);
      dispatch({ type: 'OK', product: res.data.data });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load product';
      dispatch({ type: 'ERROR', error: msg });
      showToast(msg, 'error');
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    categoryAPI
      .getAll()
      .then((r) => setCategories(r.data.data || []))
      .catch(() => {});
  }, []);

  const handleEditSuccess = (msg) => {
    setEditOpen(false);
    showToast(msg, 'success');
    fetchProduct();
  };

  const { product, loading, error } = state;

  /* ── Loading state ── */
  if (loading) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}
      >
        <Spinner size='lg' />
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !product) {
    return (
      <div style={{ textAlign: 'center', padding: 48, fontFamily: 'var(--font-sans)' }}>
        <WarnIcon style={{ fontSize: 48, color: 'var(--color-warning)', marginBottom: 12 }} />
        <h2 style={{ margin: '0 0 8px', color: 'var(--color-text-primary)' }}>Product not found</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{error}</p>
        <Button variant='secondary' onClick={() => navigate('/products')}>
          <BackIcon style={{ fontSize: 16 }} /> Back to Products
        </Button>
      </div>
    );
  }

  const totalStock = product.totalStock ?? 0;
  const stockVar = stockVariant(totalStock, product.reorder_level);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Breadcrumb / back ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate('/products')}
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
          <BackIcon style={{ fontSize: 16 }} /> Products
        </button>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>/</span>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {product.name}
        </span>
      </div>

      {/* ── Product header card ── */}
      <Card>
        <Card.Body>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Product image */}
            <div
              style={{
                width: 96,
                height: 96,
                flexShrink: 0,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-alt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <ProductIcon style={{ fontSize: 40, color: 'var(--color-text-muted)' }} />
              )}
            </div>

            {/* Core info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.2,
                  }}
                >
                  {product.name}
                </h1>
                {product.is_active ? (
                  <Badge variant='success'>Active</Badge>
                ) : (
                  <Badge variant='neutral'>Inactive</Badge>
                )}
              </div>

              {/* SKU + Barcode chips */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    background: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '3px 8px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  SKU: {product.sku}
                </span>
                {product.barcode && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      background: 'var(--color-primary-soft)',
                      border: '1px solid #bfdbfe',
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 8px',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <BarcodeIcon style={{ fontSize: 12 }} />
                    {product.barcode}
                  </span>
                )}
              </div>

              {/* Category + unit */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 10,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <Badge variant='neutral'>{product.category}</Badge>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Unit: {product.unit}
                </span>
              </div>

              {product.description && (
                <p
                  style={{
                    margin: '10px 0 0',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.55,
                    maxWidth: 560,
                  }}
                >
                  {product.description}
                </p>
              )}
            </div>

            {/* KPI pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
              <KpiPill
                label='Total Stock'
                value={totalStock}
                badge={
                  <Badge variant={stockVar} size='sm' dot>
                    {totalStock === 0
                      ? 'Out of Stock'
                      : totalStock <= product.reorder_level
                        ? 'Low Stock'
                        : 'In Stock'}
                  </Badge>
                }
              />
              <KpiPill label='Selling Price' value={fmt(product.unit_price)} />
              {product.cost_price && <KpiPill label='Cost Price' value={fmt(product.cost_price)} />}
              <KpiPill label='Reorder Level' value={product.reorder_level} />
            </div>

            {/* Edit button */}
            {isAdminOrManager && (
              <div>
                <Button
                  variant='secondary'
                  size='sm'
                  leftIcon={<EditIcon style={{ fontSize: 16 }} />}
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* ── Tab navigation ── */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '2px solid var(--color-border)',
        }}
      >
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
              transition: 'color var(--transition-base)',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon style={{ fontSize: 15 }} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab panels ── */}
      {tab === 'overview' && <OverviewTab product={product} />}
      {tab === 'inventory' && <InventoryTab product={product} user={user} />}
      {tab === 'purchases' && <PurchasesTab product={product} />}
      {tab === 'audit' && <AuditTab product={product} />}

      {/* ── Edit drawer ── */}
      <SlideDrawer open={editOpen} onClose={() => setEditOpen(false)}>
        <ProductForm
          product={product}
          categories={categories}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditOpen(false)}
          onCategoryCreated={(cat) =>
            setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
          }
        />
      </SlideDrawer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB: Overview
══════════════════════════════════════════════════════════════ */
function OverviewTab({ product }) {
  const fields = [
    {
      label: 'SKU',
      value: (
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
          {product.sku}
        </code>
      ),
    },
    { label: 'Barcode', value: product.barcode || '—' },
    { label: 'Category', value: product.category },
    { label: 'Unit', value: product.unit },
    { label: 'Selling Price', value: fmt(product.unit_price) },
    { label: 'Cost Price', value: product.cost_price ? fmt(product.cost_price) : '—' },
    { label: 'Reorder Level', value: product.reorder_level },
    { label: 'Reorder Qty', value: product.reorder_qty },
    {
      label: 'Status',
      value: product.is_active ? (
        <Badge variant='success'>Active</Badge>
      ) : (
        <Badge variant='neutral'>Inactive</Badge>
      ),
    },
    { label: 'Total Stock', value: product.totalStock },
    { label: 'Stock Value', value: fmt(product.totalStockValue) },
    { label: 'Created', value: fmtDate(product.created_at) },
    { label: 'Last Updated', value: fmtDate(product.updated_at) },
  ];

  return (
    <Card title='Product Details'>
      <Card.Body>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px 24px',
            margin: 0,
          }}
        >
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--font-sans)',
                  marginBottom: 4,
                }}
              >
                {label}
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}
              >
                {value ?? '—'}
              </dd>
            </div>
          ))}
        </dl>

        {product.description && (
          <>
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--color-border)',
                margin: '20px 0',
              }}
            />
            <div>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Description
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--text-base)',
                  lineHeight: 1.65,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {product.description}
              </p>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB: Inventory by Warehouse
══════════════════════════════════════════════════════════════ */
function InventoryTab({ product, user }) {
  const inventory = product.inventory || [];
  const isAdmin = user?.role === 'admin';

  const columns = [
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'location', label: 'Location', width: 130 },
    { key: 'qty', label: 'Qty', width: 100, align: 'center' },
    { key: 'batch', label: 'Batch No', width: 130 },
    { key: 'expiry', label: 'Expiry', width: 120 },
    { key: 'status', label: 'Status', width: 130, align: 'center' },
    { key: 'updated', label: 'Updated', width: 150, align: 'right' },
  ];

  const tdStyle = {
    padding: '10px 16px',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-primary)',
  };

  return (
    <Card
      title='Inventory by Warehouse'
      subtitle={isAdmin ? 'All warehouses' : 'Your managed warehouses'}
      action={
        <Badge variant='neutral'>
          {inventory.length} location{inventory.length !== 1 ? 's' : ''}
        </Badge>
      }
      padding={false}
    >
      <Table
        columns={columns}
        data={inventory}
        loading={false}
        emptyText='No inventory records found for this product.'
        emptyIcon={<WarehouseIcon />}
        renderRow={(inv, i) => {
          const qty = inv.quantity ?? 0;
          const rl = inv.reorder_level ?? product.reorder_level;
          const sVar = stockVariant(qty, rl);
          const sLabel = qty === 0 ? 'Out of Stock' : qty <= rl ? 'Low Stock' : 'Available';

          return (
            <tr key={inv.id ?? i}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>
                  {inv.warehouse?.name ?? `Warehouse #${inv.warehouse_id}`}
                </div>
                {inv.warehouse?.location && (
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      marginTop: 1,
                    }}
                  >
                    {inv.warehouse.location}
                  </div>
                )}
              </td>
              <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                {inv.location || '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <Badge variant={sVar} size='sm'>
                  {qty}
                </Badge>
              </td>
              <td
                style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
              >
                {inv.batch_no || '—'}
              </td>
              <td style={{ ...tdStyle, fontSize: 'var(--text-sm)' }}>
                {inv.expiry_date ? (
                  <span
                    style={{
                      color:
                        new Date(inv.expiry_date) < new Date() ? 'var(--color-danger)' : 'inherit',
                    }}
                  >
                    {fmtDate(inv.expiry_date)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <Badge variant={sVar} size='sm' dot>
                  {sLabel}
                </Badge>
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {fmtDateTime(inv.updated_at)}
              </td>
            </tr>
          );
        }}
      />
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB: Purchase History
══════════════════════════════════════════════════════════════ */
function PurchasesTab({ product }) {
  const history = product.purchaseHistory || [];

  const STATUS_VARIANT = {
    pending: 'warning',
    confirmed: 'primary',
    delivered: 'success',
    cancelled: 'danger',
    draft: 'neutral',
  };

  const columns = [
    { key: 'po_number', label: 'PO Number', width: 160 },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'order_date', label: 'Order Date', width: 130 },
    { key: 'total_amount', label: 'Amount', width: 130, align: 'right' },
    { key: 'status', label: 'Status', width: 110, align: 'center' },
  ];

  const tdStyle = {
    padding: '10px 16px',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-primary)',
  };

  return (
    <Card
      title='Purchase Order History'
      subtitle='Last 10 purchase orders containing this product'
      padding={false}
    >
      <Table
        columns={columns}
        data={history}
        loading={false}
        emptyText='No purchase orders found for this product.'
        emptyIcon={<POIcon />}
        renderRow={(po, i) => (
          <tr key={po.po_id ?? i}>
            <td style={tdStyle}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                }}
              >
                {po.po_number}
              </span>
            </td>
            <td style={tdStyle}>{po.supplier_name}</td>
            <td
              style={{
                ...tdStyle,
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {fmtDate(po.order_date)}
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              {fmt(po.total_amount)}
            </td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>
              <Badge variant={STATUS_VARIANT[po.status] || 'neutral'} size='sm'>
                {po.status}
              </Badge>
            </td>
          </tr>
        )}
      />
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB: Audit Log
══════════════════════════════════════════════════════════════ */
function AuditTab({ product }) {
  const logs = product.auditLog || [];

  return (
    <Card title='Audit Log' subtitle='Change history for this product'>
      <Card.Body padding={false}>
        {logs.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
            }}
          >
            No audit entries recorded yet.
          </div>
        ) : (
          <ul style={{ margin: 0, padding: '8px 0', listStyle: 'none' }}>
            {logs.map((log, i) => (
              <li
                key={log.log_id ?? i}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '12px 20px',
                  borderBottom: i < logs.length - 1 ? '1px solid var(--color-border)' : 'none',
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
                  {actionIcon(log.action)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                      {relTime(log.timestamp)} · {fmtDateTime(log.timestamp)}
                    </span>
                  </div>

                  {/* Changes diff */}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {Object.entries(log.changes)
                        .filter(([k]) => !['new', 'deleted'].includes(k))
                        .map(([field, val]) => (
                          <div
                            key={field}
                            style={{
                              fontSize: 'var(--text-xs)',
                              fontFamily: 'var(--font-sans)',
                              color: 'var(--color-text-secondary)',
                              display: 'flex',
                              gap: 6,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <code
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 'var(--text-xs)',
                                background: 'var(--color-surface-alt)',
                                padding: '1px 5px',
                                borderRadius: 3,
                              }}
                            >
                              {field}
                            </code>
                            {val?.old !== undefined && (
                              <>
                                <span
                                  style={{
                                    color: 'var(--color-danger)',
                                    textDecoration: 'line-through',
                                  }}
                                >
                                  {String(val.old)}
                                </span>
                                <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                                <span style={{ color: 'var(--color-success)' }}>
                                  {String(val.new)}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
}

/* ── KPI pill used in product header ─────────────────────────── */
function KpiPill({ label, value, badge }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '8px 12px',
        background: 'var(--color-surface-alt)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}
    >
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
        {label}
      </span>
      {badge ? (
        badge
      ) : (
        <span
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {value ?? '—'}
        </span>
      )}
    </div>
  );
}
