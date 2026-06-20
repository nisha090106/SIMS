import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import {
  Package, ArrowUpDown, Truck, ShoppingCart,
  BarChart3, RefreshCw, FileText, History,
} from 'lucide-react';
import reportAPI from '../services/reportAPI';
import '../styles/Reports.css';

// Lazy-load tab panels so each tab's bundle is only fetched on demand
const InventoryTab          = lazy(() => import('./Reports/tabs/InventoryTab'));
const StockMovementTab      = lazy(() => import('./Reports/tabs/StockMovementTab'));
const SupplierTab           = lazy(() => import('./Reports/tabs/SupplierTab'));
const SalesTab              = lazy(() => import('./Reports/tabs/SalesTab'));
const PurchaseOrderTab      = lazy(() => import('./Reports/tabs/PurchaseOrderTab'));
const RequestFulfillmentTab = lazy(() => import('./Reports/tabs/RequestFulfillmentTab'));
const AuditLogTab           = lazy(() => import('./Reports/tabs/AuditLogTab'));

/* ── Tab registry ──────────────────────────────────────────── */
const TABS = [
  { id: 'inventory',          label: 'Inventory',           icon: <Package size={15} />,     component: InventoryTab },
  { id: 'stock-movement',     label: 'Stock Movement',      icon: <ArrowUpDown size={15} />, component: StockMovementTab },
  { id: 'supplier',           label: 'Supplier Performance',icon: <Truck size={15} />,       component: SupplierTab },
  { id: 'sales',              label: 'Sales',               icon: <ShoppingCart size={15} />, component: SalesTab },
  { id: 'purchase-orders',    label: 'Purchase Orders',     icon: <ShoppingCart size={15} />, component: PurchaseOrderTab },
  { id: 'request-fulfillment',label: 'Request Fulfillment', icon: <FileText size={15} />,     component: RequestFulfillmentTab },
  { id: 'audit-log',          label: 'Audit Log',           icon: <History size={15} />,      component: AuditLogTab, adminOnly: true },
];

/* ── Overview KPI strip at the top ────────────────────────── */
function OverviewStrip() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportAPI.getDashboard();
      setStats(res.data.data);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = [
    { label: 'Total Products',   value: stats?.totalProducts?.toLocaleString() },
    { label: 'Total Stock Value',value: stats?.totalStockValue != null ? `₹${Number(stats.totalStockValue).toLocaleString('en-IN')}` : null },
    { label: 'Low Stock Items',  value: stats?.lowStockCount?.toLocaleString(),  warn: stats?.lowStockCount > 0 },
    { label: 'Pending Orders',   value: stats?.draftSubmittedOrdersCount?.toLocaleString() },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 12,
      marginBottom: 24,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#000000',
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {item.label}
          </p>
          {loading ? (
            <div style={{ height: 22, width: '55%', borderRadius: 4, background: '#f1f5f9', marginTop: 6 }} />
          ) : (
            <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800,
              color: item.warn ? '#d97706' : 'var(--color-text-primary)' }}>
              {item.value ?? '—'}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Tab skeleton while lazy-loading ───────────────────────── */
function TabSkeleton() {
  return (
    <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <RefreshCw size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#000000' }} />
      <span style={{ color: '#000000', fontSize: 14 }}>Loading report…</span>
    </div>
  );
}

/* ── Main Reports page ──────────────────────────────────────── */
export default function Reports() {
  const { user } = useSelector(s => s.auth);
  const [activeTab, setActiveTab] = useState('inventory');

  const visibleTabs = TABS.filter(tab => !tab.adminOnly || user?.role === 'admin');
  const ActiveComponent = visibleTabs.find(t => t.id === activeTab)?.component;

  return (
    <div className="reports-page">
      {/* Page header */}
      <div className="reports-header">
        <div className="reports-header-left">
          <h1>
            <BarChart3 size={26} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle', color: '#000000' }} />
            Reports &amp; Analytics
          </h1>
          <p>Inventory valuations, stock movements, supplier analytics, and sales aggregations</p>
        </div>
      </div>

      {/* Overview KPI strip */}
      <OverviewStrip />

      {/* Tab bar */}
      <div className="reports-tabs">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            className={`reports-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content, lazy-loaded */}
      <Suspense fallback={<TabSkeleton />}>
        {ActiveComponent && <ActiveComponent userRole={user?.role} />}
      </Suspense>
    </div>
  );
}
