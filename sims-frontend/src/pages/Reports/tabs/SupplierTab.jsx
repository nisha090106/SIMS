import React, { useState, useCallback, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Cell,
} from 'recharts';
import { Truck, IndianRupee, Star, CheckCircle, TrendingUp } from 'lucide-react';
import { supplierAPI } from '../../../services/api';
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

export default function SupplierTab() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [page,      setPage]      = useState(1);

  const [filters, setFilters] = useState({
    supplierId: '', from: '', to: '', status: '', limit: 15,
  });

  useEffect(() => {
    supplierAPI.getAll({ limit: 200 })
      .then(r => setSuppliers(r.data.data || r.data.suppliers || []))
      .catch(() => {});
  }, []);

  const fetch = useCallback(async (pageNum = page) => {
    try {
      setLoading(true);
      const params = { ...filters, page: pageNum };
      Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });
      const res = await reportAPI.getSupplierPerformance(params);
      setData(res.data.data);
    } catch (e) {
      console.error('Supplier report error', e);
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
      const res = await reportAPI.exportReport('supplier-performance', params);
      downloadBlob(res.data, `supplier-performance-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (e) { console.error('Export error', e); }
  };

  // Top 6 by spend for charts
  const top6 = (data?.items || []).slice(0, 6);

  // Radar data: normalise fulfillmentRate and avgOrderValue for radar
  const maxSpend = Math.max(1, ...top6.map(s => s.totalSpent));
  const radarData = top6.map(s => ({
    supplier:       s.name.split(' ')[0], // short name
    fulfillment:    parseFloat(s.fulfillmentRate),
    rating:         (Number(s.rating) / 5) * 100,
    spend:          (s.totalSpent / maxSpend) * 100,
  }));

  const columns = [
    { key: 'name',             label: 'Supplier' },
    { key: 'totalOrders',      label: 'Orders',       align: 'right', render: v => fmtNum(v) },
    { key: 'completedOrders',  label: 'Completed',    align: 'right', render: v => fmtNum(v) },
    { key: 'cancelledOrders',  label: 'Cancelled',    align: 'right', render: v => fmtNum(v) },
    { key: 'totalSpent',       label: 'Total Spent',  align: 'right', render: v => fmtCurrency(v) },
    { key: 'avgOrderValue',    label: 'Avg Order',    align: 'right', render: v => fmtCurrency(v) },
    {
      key: 'fulfillmentRate',  label: 'Fulfillment',  align: 'right',
      render: v => {
        const n = parseFloat(v);
        const color = n >= 80 ? '#10b981' : n >= 50 ? '#f59e0b' : '#f43f5e';
        return (
          <span style={{ color, fontWeight: 700 }}>{n.toFixed(1)}%</span>
        );
      },
    },
    {
      key: 'cancellationRate', label: 'Cancel Rate', align: 'right',
      render: v => <span style={{ color: parseFloat(v) > 20 ? '#f43f5e' : '#64748b' }}>{parseFloat(v).toFixed(1)}%</span>,
    },
    { key: 'leadTime',         label: 'Lead Time', align: 'right', render: v => v ? `${v}d` : '—' },
    {
      key: 'rating',           label: 'Rating', align: 'right',
      render: v => {
        const n = Number(v);
        return n > 0 ? (
          <span style={{ color: '#000000', fontWeight: 700 }}>★ {n.toFixed(1)}</span>
        ) : '—';
      },
    },
    {
      key: 'supplierStatus', label: 'Status',
      render: v => <span className={`status-pill ${STATUS_PILL[v] ?? 'draft'}`}>{v}</span>,
    },
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
        <KpiCard icon={<Truck size={20}/>}       label="Total Suppliers"  color="blue"   loading={loading} value={fmtNum(data?.summary?.totalSuppliers)} />
        <KpiCard icon={<CheckCircle size={20}/>} label="Active Suppliers" color="green"  loading={loading} value={fmtNum(data?.summary?.activeSuppliers)} />
        <KpiCard icon={<DollarSign size={20}/>}  label="Total Spent"      color="purple" loading={loading} value={fmtCurrency(data?.summary?.totalSpent)} />
        <KpiCard icon={<TrendingUp size={20}/>}  label="Total POs"        color="orange" loading={loading} value={fmtNum(data?.summary?.totalOrders)} />
        <KpiCard icon={<Star size={20}/>}        label="Avg Fulfillment"  color="cyan"   loading={loading}
          value={data?.summary?.avgFulfillmentRate ? `${data.summary.avgFulfillmentRate}%` : '—'} />
      </div>

      {/* Charts */}
      {top6.length > 0 && (
        <div className="reports-chart-row">
          {/* Spending bar */}
          <div className="reports-chart-card">
            <h3>Spend by Supplier (Top 6)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top6} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtCurrency(v), 'Spent']} />
                <Bar dataKey="totalSpent" name="Total Spent" radius={[4,4,0,0]}>
                  {top6.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Fulfillment rate bar */}
          <div className="reports-chart-card">
            <h3>Fulfillment Rate % (Top 6)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top6} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${parseFloat(v).toFixed(1)}%`, 'Fulfillment']} />
                <Bar dataKey="fulfillmentRate" name="Fulfillment %" radius={[4,4,0,0]}>
                  {top6.map((entry, i) => (
                    <Cell key={i} fill={parseFloat(entry.fulfillmentRate) >= 80 ? '#10b981' : parseFloat(entry.fulfillmentRate) >= 50 ? '#f59e0b' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar: multi-metric comparison */}
          {radarData.length > 1 && (
            <div className="reports-chart-card">
              <h3>Supplier Comparison (Radar)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={90}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="supplier" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar name="Fulfillment" dataKey="fulfillment" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                  <Radar name="Rating (scaled)" dataKey="rating" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  <Radar name="Spend (relative)" dataKey="spend" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${Number(v).toFixed(1)}`, '']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <ReportTable
        title="Supplier Performance"
        columns={columns}
        rows={data?.items || []}
        loading={loading}
        serverPage={data?.pagination?.page}
        serverPages={data?.pagination?.pages}
        serverTotal={data?.pagination?.total}
        onPageChange={handlePageChange}
      />

      {/* Suppliers with no orders */}
      {data?.suppliersWithoutOrders?.length > 0 && (
        <div className="reports-table-card" style={{ marginTop: 16 }}>
          <div className="reports-table-header">
            <h3>Active Suppliers with No Orders</h3>
            <span className="table-badge" style={{ background: '#fef3c7', color: '#000000' }}>
              {data.suppliersWithoutOrders.length}
            </span>
          </div>
          <div className="reports-table-wrap">
            <table className="reports-data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th className="right">Rating</th>
                  <th className="right">Lead Time</th>
                </tr>
              </thead>
              <tbody>
                {data.suppliersWithoutOrders.map(s => (
                  <tr key={s.supplierId}>
                    <td>{s.name}</td>
                    <td className="right">{s.rating > 0 ? `★ ${Number(s.rating).toFixed(1)}` : '—'}</td>
                    <td className="right">{s.leadTime ? `${s.leadTime}d` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
