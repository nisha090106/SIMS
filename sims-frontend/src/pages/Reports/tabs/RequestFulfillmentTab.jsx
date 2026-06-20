import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell
} from 'recharts';
import { FileText, CheckCircle, Clock, Percent } from 'lucide-react';
import { warehouseAPI } from '../../../services/api';
import reportAPI from '../../../services/reportAPI';
import KpiCard from '../shared/KpiCard';
import ReportTable from '../shared/ReportTable';
import FilterBar, { FilterField } from '../shared/FilterBar';
import { downloadBlob, fmtNum, fmtDate, STATUS_PILL, CHART_COLORS, TOOLTIP_STYLE } from '../reportUtils';

const STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'approved',  label: 'Approved' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function RequestFulfillmentTab({ userRole }) {
  const user = useSelector(s => s.auth.user);
  const role = userRole || user?.role || 'staff';
  const isAdmin = role === 'admin';

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [page,       setPage]       = useState(1);

  const [filters, setFilters] = useState({
    status: '', warehouseId: '', from: '', to: '', limit: 15,
  });

  // Client-side requester filter
  const [selectedRequester, setSelectedRequester] = useState('');

  useEffect(() => {
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
      const res = await reportAPI.getRequestFulfillment(params);
      setData(res.data.data);
    } catch (e) {
      console.error('Request fulfillment report error', e);
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
      const res = await reportAPI.exportReport('request-fulfillment', params);
      downloadBlob(res.data, `request-fulfillment-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (e) { console.error('Export error', e); }
  };

  const getUniqueRequesters = () => {
    const requestersMap = {};
    (data?.items || []).forEach(item => {
      if (item.requester) {
        requestersMap[item.requester] = true;
      }
    });
    return Object.keys(requestersMap).sort();
  };

  const uniqueRequesters = getUniqueRequesters();

  const filteredItems = (data?.items || []).filter(item => {
    if (!selectedRequester) return true;
    return item.requester === selectedRequester;
  });

  // Charts
  const statusChart = data?.summary?.statusBreakdown
    ? Object.entries(data.summary.statusBreakdown).map(([status, count]) => ({
        status: status.toUpperCase(),
        count,
      }))
    : [];

  const priorityChart = data?.summary?.priorityBreakdown
    ? Object.entries(data.summary.priorityBreakdown).map(([priority, count]) => ({
        priority: priority.toUpperCase(),
        count,
      }))
    : [];

  const columns = [
    { key: 'requestNumber',   label: 'Request#' },
    { key: 'requester',       label: 'Requester' },
    { key: 'warehouse',       label: 'Warehouse' },
    { key: 'itemCount',       label: 'Items',        align: 'right', render: v => fmtNum(v) },
    { key: 'totalRequested',  label: 'Requested',    align: 'right', render: v => fmtNum(v) },
    { key: 'totalFulfilled',  label: 'Fulfilled',    align: 'right', render: v => fmtNum(v) },
    {
      key: 'fulfillmentRate', label: 'Rate',         align: 'right',
      render: v => <span style={{ fontWeight: 700, color: parseFloat(v) >= 80 ? '#10b981' : parseFloat(v) >= 50 ? '#f59e0b' : '#f43f5e' }}>{parseFloat(v).toFixed(1)}%</span>
    },
    {
      key: 'status',          label: 'Status',
      render: v => <span className={`status-pill ${STATUS_PILL[v] ?? 'draft'}`}>{v}</span>,
    },
    {
      key: 'priority',        label: 'Priority',
      render: v => (
        <span className={`status-pill ${v === 'high' || v === 'urgent' ? 'cancelled' : v === 'medium' ? 'pending' : 'approved'}`} style={{ textTransform: 'uppercase' }}>
          {v}
        </span>
      ),
    },
    { key: 'createdAt',       label: 'Created At',   render: v => fmtDate(v) },
  ];

  return (
    <>
      <FilterBar onApply={handleApply} onExport={handleExport} loading={loading}>
        <FilterField label="Order Status">
          <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
        <FilterField label="Requester">
          <select value={selectedRequester} onChange={e => setSelectedRequester(e.target.value)} disabled={uniqueRequesters.length === 0}>
            <option value="">All Requesters</option>
            {uniqueRequesters.map(r => <option key={r} value={r}>{r}</option>)}
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
        <KpiCard icon={<FileText size={20}/>}      label="Total Requests"     color="blue"   loading={loading} value={fmtNum(data?.summary?.totalRequests)} />
        <KpiCard icon={<Percent size={20}/>}       label="Fulfillment Rate"  color="green"  loading={loading} value={data?.summary?.overallFulfillmentRate ? `${data.summary.overallFulfillmentRate}%` : '—'} />
        <KpiCard icon={<CheckCircle size={20}/>}   label="Fulfilled Requests" color="cyan"   loading={loading} value={fmtNum(data?.summary?.statusBreakdown?.fulfilled || data?.summary?.statusBreakdown?.fulfilled_qty)} />
        <KpiCard icon={<Clock size={20}/>}         label="Pending Requests"   color="orange" loading={loading} value={fmtNum(data?.summary?.statusBreakdown?.pending)} />
      </div>

      {/* Charts */}
      {(statusChart.length > 0 || priorityChart.length > 0) && (
        <div className="reports-chart-row">
          {statusChart.length > 0 && (
            <div className="reports-chart-card">
              <h3>Requests by Status</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusChart} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtNum(v), 'Requests']} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {statusChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {priorityChart.length > 0 && (
            <div className="reports-chart-card">
              <h3>Requests by Priority</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={priorityChart} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="priority" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtNum(v), 'Requests']} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {priorityChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <ReportTable
        title="Requests Fulfillment List"
        columns={columns}
        rows={filteredItems}
        loading={loading}
        serverPage={data?.pagination?.page}
        serverPages={data?.pagination?.pages}
        serverTotal={data?.pagination?.total}
        onPageChange={handlePageChange}
      />
    </>
  );
}
