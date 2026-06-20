import React, { useState, useCallback, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { ShoppingCart, IndianRupee, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { warehouseAPI } from '../../../services/api';
import reportAPI from '../../../services/reportAPI';
import KpiCard from '../shared/KpiCard';
import ReportTable from '../shared/ReportTable';
import FilterBar, { FilterField } from '../shared/FilterBar';
import { downloadBlob, fmtCurrency, fmtNum, fmtDate, STATUS_PILL, CHART_COLORS, TOOLTIP_STYLE } from '../reportUtils';

const SALES_STATUSES = [
  { value: '',          label: 'All Statuses' },
  { value: 'draft',     label: 'Draft' },
  { value: 'pending',   label: 'Pending' },
  { value: 'dispatched',label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  draft:      '#94a3b8',
  pending:    '#f59e0b',
  dispatched: '#0891b2',
  delivered:  '#10b981',
  cancelled:  '#f43f5e',
};

export default function SalesTab() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [page,       setPage]       = useState(1);

  const [filters, setFilters] = useState({
    warehouseId: '', from: '', to: '', status: '', search: '', limit: 15,
  });

  useEffect(() => {
    warehouseAPI.getAll({ limit: 100 })
      .then(r => setWarehouses(r.data.data || r.data.warehouses || []))
      .catch(() => {});
  }, []);

  const fetch = useCallback(async (pageNum = page) => {
    try {
      setLoading(true);
      const params = { ...filters, page: pageNum };
      Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });
      const res = await reportAPI.getSales(params);
      setData(res.data.data);
    } catch (e) {
      console.error('Sales report error', e);
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
      const res = await reportAPI.exportReport('sales', params);
      downloadBlob(res.data, `sales-report-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (e) { console.error('Export error', e); }
  };

  // Status pie data
  const statusPie = data?.summary?.statusBreakdown
    ? Object.entries(data.summary.statusBreakdown).map(([status, count]) => ({ status, count }))
    : [];

  const topProds = (data?.topProducts || []).slice(0, 8);

  const columns = [
    { key: 'orderNumber',  label: 'Order #',  render: v => <span className="mono">{v}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'orderDate',    label: 'Date',     render: v => fmtDate(v) },
    { key: 'deliveryDate', label: 'Delivery', render: v => fmtDate(v) },
    {
      key: 'status', label: 'Status',
      render: v => <span className={`status-pill ${STATUS_PILL[v] ?? 'draft'}`}>{v}</span>,
    },
    { key: 'totalAmount', label: 'Amount',    align: 'right', render: v => fmtCurrency(v) },
    { key: 'itemCount',   label: 'Items',     align: 'right' },
    { key: 'warehouse',   label: 'Warehouse' },
    { key: 'createdBy',   label: 'Created By' },
  ];

  return (
    <>
      <FilterBar onApply={handleApply} onExport={handleExport} loading={loading}>
        <FilterField label="Warehouse">
          <select value={filters.warehouseId} onChange={e => setFilters(p => ({ ...p, warehouseId: e.target.value }))}>
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            {SALES_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FilterField>
        <FilterField label="From">
          <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
        </FilterField>
        <FilterField label="To">
          <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
        </FilterField>
        <FilterField label="Customer">
          <input placeholder="Search customer…" value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
        </FilterField>
      </FilterBar>

      {/* KPI Cards */}
      <div className="reports-kpi-grid">
        <KpiCard icon={<ShoppingCart size={20}/>} label="Total Orders"    color="blue"   loading={loading} value={fmtNum(data?.summary?.totalOrders)} />
        <KpiCard icon={<IndianRupee size={20}/>}   label="Total Revenue"   color="green"  loading={loading} value={fmtCurrency(data?.summary?.totalRevenue)} />
        <KpiCard icon={<TrendingUp size={20}/>}   label="Avg Order Value" color="purple" loading={loading}
          value={data?.summary?.avgOrderValue ? fmtCurrency(data.summary.avgOrderValue) : '—'} />
        <KpiCard icon={<CheckCircle size={20}/>}  label="Delivered"       color="cyan"   loading={loading} value={fmtNum(data?.summary?.deliveredOrders)} />
        <KpiCard icon={<XCircle size={20}/>}      label="Cancelled"       color="rose"   loading={loading} value={fmtNum(data?.summary?.cancelledOrders)} />
      </div>

      {/* Charts */}
      <div className="reports-chart-row">
        {/* Monthly revenue line chart — spans full row */}
        {data?.monthlyAggregation?.length > 0 && (
          <div className="reports-chart-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Monthly Sales Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyAggregation} margin={{ left: -10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="revenue" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(v, name) =>
                    name === 'Revenue (₹)' ? [fmtCurrency(v), name] : [fmtNum(v), name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="revenue" type="monotone" dataKey="totalRevenue" stroke="#10b981" strokeWidth={3}
                  name="Revenue (₹)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="orders" type="monotone" dataKey="orderCount" stroke="#3b82f6" strokeWidth={2}
                  name="Orders" dot={{ r: 3 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status distribution pie */}
        {statusPie.length > 0 && (
          <div className="reports-chart-card">
            <h3>Order Status Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusPie} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusPie.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [fmtNum(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top products bar */}
        {topProds.length > 0 && (
          <div className="reports-chart-card">
            <h3>Top Products by Revenue</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProds} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0,4,4,0]}>
                  {topProds.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <ReportTable
        title="Sales Orders"
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
