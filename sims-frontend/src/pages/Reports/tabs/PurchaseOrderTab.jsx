import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell
} from 'recharts';
import { ShoppingCart, IndianRupee, Clock } from 'lucide-react';
import { supplierAPI, warehouseAPI } from '../../../services/api';
import reportAPI from '../../../services/reportAPI';
import KpiCard from '../shared/KpiCard';
import ReportTable from '../shared/ReportTable';
import FilterBar, { FilterField } from '../shared/FilterBar';
import { downloadBlob, fmtCurrency, fmtNum, fmtDate, STATUS_PILL, CHART_COLORS, TOOLTIP_STYLE } from '../reportUtils';

const PO_STATUSES = [
  { value: '',          label: 'All Statuses' },
  { value: 'draft',     label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved',  label: 'Approved' },
  { value: 'received',  label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PurchaseOrderTab({ userRole }) {
  const user = useSelector(s => s.auth.user);
  const role = userRole || user?.role || 'staff';
  const isAdmin = role === 'admin';

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [suppliers,  setSuppliers]  = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [page,       setPage]       = useState(1);

  const [filters, setFilters] = useState({
    supplierId: '', warehouseId: '', status: '', from: '', to: '', limit: 15,
  });

  useEffect(() => {
    supplierAPI.getAll({ limit: 200 })
      .then(r => setSuppliers(r.data.data || r.data.suppliers || []))
      .catch(() => {});

    if (isAdmin) {
      warehouseAPI.getAll({ limit: 100 })
        .then(r => setWarehouses(r.data.data || r.data.warehouses || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetch = useCallback(async (pageNum = page) => {
    try {
      setLoading(true);
      const params = { ...filters, page: pageNum };
      Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });
      const res = await reportAPI.getPurchaseOrders(params);
      setData(res.data.data);
    } catch (e) {
      console.error('Purchase orders report error', e);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetch(1); setPage(1); }, []);

  const handleApply      = () => { fetch(1); setPage(1); };
  const handlePageChange  = p  => { setPage(p); fetch(p); };

  const handleExport = async () => {
    try {
      const params = { ...filters, format: 'csv' };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const res = await reportAPI.exportReport('purchase-orders', params);
      downloadBlob(res.data, `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (e) { console.error('Export error', e); }
  };

  // Monthly trend chart data
  const getMonthlyTrend = () => {
    const monthlyData = {};
    (data?.items || []).forEach(po => {
      if (!po.orderDate) return;
      const date = new Date(po.orderDate);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[yearMonth] = (monthlyData[yearMonth] || 0) + (po.totalAmount || 0);
    });

    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, value]) => ({
        month,
        value: parseFloat(value.toFixed(2)),
      }));
  };

  // Status Breakdown chart data
  const statusChart = data?.summary?.statusBreakdown
    ? Object.entries(data.summary.statusBreakdown).map(([status, count]) => ({
        status: status.toUpperCase(),
        count,
      }))
    : [];

  const trendData = getMonthlyTrend();

  const columns = [
    { key: 'poNumber',         label: 'PO#' },
    { key: 'supplier',         label: 'Supplier' },
    { key: 'warehouse',        label: 'Warehouse' },
    { key: 'itemCount',        label: 'Items',        align: 'right', render: v => fmtNum(v) },
    { key: 'totalAmount',      label: 'Total Value',  align: 'right', render: v => fmtCurrency(v) },
    {
      key: 'status',           label: 'Status',
      render: v => <span className={`status-pill ${STATUS_PILL[v] ?? 'draft'}`}>{v}</span>,
    },
    { key: 'orderDate',        label: 'Order Date',   render: v => fmtDate(v) },
    { key: 'expectedDelivery', label: 'Expected',     render: v => fmtDate(v) },
    { key: 'createdBy',        label: 'Created By' },
  ];

  return (
    <>
      <FilterBar onApply={handleApply} onExport={handleExport} loading={loading}>
        <FilterField label="Supplier">
          <select value={filters.supplierId} onChange={e => setFilters(p => ({ ...p, supplierId: e.target.value }))}>
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
          </select>
        </FilterField>
        {isAdmin && (
          <FilterField label="Warehouse">
            <select value={filters.warehouseId} onChange={e => setFilters(p => ({ ...p, warehouseId: e.target.value }))}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
            </select>
          </FilterField>
        )}
        <FilterField label="Order Status">
          <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            {PO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FilterField>
        <FilterField label="From">
          <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
        </FilterField>
        <FilterField label="To">
          <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
        </FilterField>
      </FilterBar>

      {/* KPI Cards */}
      <div className="reports-kpi-grid">
        <KpiCard icon={<ShoppingCart size={20}/>} label="Total POs"        color="blue"   loading={loading} value={fmtNum(data?.summary?.totalOrders)} />
        <KpiCard icon={<IndianRupee size={20}/>}   label="Total Value"      color="green"  loading={loading} value={fmtCurrency(data?.summary?.totalValue)} />
        <KpiCard icon={<Clock size={20}/>}        label="Auto Drafted"     color="purple" loading={loading} value={fmtNum(data?.summary?.autoDraftedCount)} />
      </div>

      {/* Charts */}
      {(trendData.length > 0 || statusChart.length > 0) && (
        <div className="reports-chart-row">
          {trendData.length > 0 && (
            <div className="reports-chart-card">
              <h3>Monthly Spend Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtCurrency(v), 'Value']} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {statusChart.length > 0 && (
            <div className="reports-chart-card">
              <h3>Orders by Status</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusChart} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtNum(v), 'Orders']} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {statusChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <ReportTable
        title="Purchase Orders List"
        columns={columns}
        rows={data?.items || []}
        loading={loading}
        serverPage={data?.pagination?.page}
        serverPages={data?.pagination?.pages}
        serverTotal={data?.pagination?.total}
        onPageChange={handlePageChange}
      />
    </>
  );
}
