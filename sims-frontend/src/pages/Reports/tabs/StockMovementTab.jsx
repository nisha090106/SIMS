import React, { useState, useCallback, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell,
} from 'recharts';
import { ArrowUpDown, Activity } from 'lucide-react';
import reportAPI from '../../../services/reportAPI';
import KpiCard from '../shared/KpiCard';
import ReportTable from '../shared/ReportTable';
import FilterBar, { FilterField } from '../shared/FilterBar';
import { downloadBlob, fmtDateTime, fmtNum, STATUS_PILL, CHART_COLORS, TOOLTIP_STYLE } from '../reportUtils';

const ACTION_LABELS = [
  { value: '',                    label: 'All Actions' },
  { value: 'create',              label: 'Create' },
  { value: 'update',              label: 'Update' },
  { value: 'BARCODE_SCAN',        label: 'Barcode Scan' },
  { value: 'RECEIVE_PURCHASE_ORDER', label: 'Receive PO' },
  { value: 'REQUEST_FULFILLED',   label: 'Request Fulfilled' },
];

export default function StockMovementTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);

  const [filters, setFilters] = useState({
    from: '', to: '', action: '', limit: 20,
  });

  const fetch = useCallback(async (pageNum = page) => {
    try {
      setLoading(true);
      const params = { ...filters, page: pageNum };
      // strip empty strings so the backend doesn't receive blank date params
      Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });
      const res = await reportAPI.getStockMovement(params);
      setData(res.data.data);
    } catch (e) {
      console.error('Stock movement error', e);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetch(1); setPage(1); }, []);

  const handleApply     = () => { fetch(1); setPage(1); };
  const handlePageChange = p  => { setPage(p); fetch(p); };

  const handleExport = async () => {
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const res = await reportAPI.exportReport('stock-movement', { ...params, format: 'csv' });
      downloadBlob(res.data, `stock-movement-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (e) { console.error('Export error', e); }
  };

  // Action frequency chart data
  const actionChart = data?.summary?.actionBreakdown
    ? Object.entries(data.summary.actionBreakdown)
        .map(([action, count]) => ({ action: action.replace(/_/g, ' '), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    : [];

  const columns = [
    { key: 'timestamp', label: 'Date / Time',  render: v => fmtDateTime(v) },
    { key: 'user',      label: 'User' },
    {
      key: 'action', label: 'Action',
      render: v => (
        <span className={`status-pill ${STATUS_PILL[v?.toLowerCase()] ?? 'draft'}`}
          style={{ textTransform: 'none' }}>
          {v?.replace(/_/g, ' ')}
        </span>
      ),
    },
    { key: 'entity',         label: 'Entity' },
    {
      key: 'quantityChange', label: 'Qty Change', align: 'right',
      render: v => {
        if (v === null || v === undefined) return '—';
        const n = Number(v);
        return (
          <span style={{ color: n > 0 ? '#10b981' : n < 0 ? '#f43f5e' : '#64748b', fontWeight: 600 }}>
            {n > 0 ? `+${n}` : n}
          </span>
        );
      },
    },
    { key: 'reference',  label: 'Reference' },
    { key: 'ipAddress',  label: 'IP Address', render: v => v || '—' },
  ];

  return (
    <>
      <FilterBar onApply={handleApply} onExport={handleExport} loading={loading}>
        <FilterField label="From">
          <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
        </FilterField>
        <FilterField label="To">
          <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
        </FilterField>
        <FilterField label="Action">
          <select value={filters.action} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}>
            {ACTION_LABELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </FilterField>
        <FilterField label="Rows per page">
          <select value={filters.limit} onChange={e => setFilters(p => ({ ...p, limit: Number(e.target.value) }))}>
            {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </FilterField>
      </FilterBar>

      {/* KPIs */}
      <div className="reports-kpi-grid">
        <KpiCard icon={<ArrowUpDown size={20}/>} label="Total Movements" color="blue"   loading={loading}
          value={fmtNum(data?.summary?.totalMovements)} />
        <KpiCard icon={<Activity size={20}/>}    label="Distinct Actions" color="purple" loading={loading}
          value={fmtNum(actionChart.length)} />
      </div>

      {/* Action frequency bar chart */}
      {actionChart.length > 0 && (
        <div className="reports-chart-row">
          <div className="reports-chart-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Movement by Action Type</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={actionChart} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="action" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtNum(v), 'Events']} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {actionChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <ReportTable
        title="Stock Movement Log"
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
