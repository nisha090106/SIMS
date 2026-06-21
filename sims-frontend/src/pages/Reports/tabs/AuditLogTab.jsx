import React, { useState, useCallback, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { History, Users, Activity } from 'lucide-react';
import { settingsAPI } from '../../../services/api';
import reportAPI from '../../../services/reportAPI';
import KpiCard from '../shared/KpiCard';
import ReportTable from '../shared/ReportTable';
import FilterBar, { FilterField } from '../shared/FilterBar';
import {
  downloadBlob,
  fmtNum,
  fmtDateTime,
  STATUS_PILL,
  CHART_COLORS,
  TOOLTIP_STYLE,
} from '../reportUtils';

const AUDIT_ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'BARCODE_SCAN', label: 'Barcode Scan' },
  { value: 'CREATE_PURCHASE_ORDER', label: 'Create PO' },
  { value: 'RECEIVE_PURCHASE_ORDER', label: 'Receive PO' },
];

export default function AuditLogTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    from: '',
    to: '',
    limit: 25,
  });

  useEffect(() => {
    settingsAPI
      .getUsers({ limit: 200 })
      .then((r) => setUsers(r.data.data.users || r.data.data || []))
      .catch(() => {});
  }, []);

  const fetch = useCallback(
    async (pageNum = page) => {
      try {
        setLoading(true);
        const params = { ...filters, page: pageNum };
        Object.keys(params).forEach((k) => {
          if (params[k] === '') delete params[k];
        });
        const res = await reportAPI.getAuditLog(params);
        setData(res.data.data);
      } catch (e) {
        console.error('Audit log report error', e);
      } finally {
        setLoading(false);
      }
    },
    [filters, page],
  );

  useEffect(() => {
    fetch(1);
    setPage(1);
  }, []);

  const handleApply = () => {
    fetch(1);
    setPage(1);
  };
  const handlePageChange = (p) => {
    setPage(p);
    fetch(p);
  };

  const handleExport = async () => {
    try {
      const params = { ...filters, format: 'csv' };
      Object.keys(params).forEach((k) => {
        if (!params[k]) delete params[k];
      });
      const res = await reportAPI.exportReport('audit-log', params);
      downloadBlob(res.data, `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (e) {
      console.error('Export error', e);
    }
  };

  const actionChart = data?.summary?.actionBreakdown
    ? Object.entries(data.summary.actionBreakdown)
        .map(([action, count]) => ({ action: action.replace(/_/g, ' '), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    : [];

  const columns = [
    { key: 'timestamp', label: 'Timestamp', render: (v) => fmtDateTime(v) },
    { key: 'user', label: 'User' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (v) => v?.toUpperCase() },
    {
      key: 'action',
      label: 'Action',
      render: (v) => (
        <span
          className={`status-pill ${STATUS_PILL[v?.toLowerCase()] ?? 'draft'}`}
          style={{ textTransform: 'none' }}
        >
          {v?.replace(/_/g, ' ')}
        </span>
      ),
    },
    { key: 'entity', label: 'Entity' },
    {
      key: 'changes',
      label: 'Changes/Details',
      render: (v) =>
        v ? (
          <div
            style={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
            title={v}
          >
            {v}
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'ipAddress', label: 'IP Address', render: (v) => v || '—' },
  ];

  return (
    <>
      <FilterBar onApply={handleApply} onExport={handleExport} loading={loading}>
        <FilterField label='User'>
          <select
            value={filters.userId}
            onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))}
          >
            <option value=''>All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label='Action'>
          <select
            value={filters.action}
            onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
          >
            {AUDIT_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label='From'>
          <input
            type='date'
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
          />
        </FilterField>
        <FilterField label='To'>
          <input
            type='date'
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
          />
        </FilterField>
        <FilterField label='Rows per page'>
          <select
            value={filters.limit}
            onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value) }))}
          >
            {[15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {/* KPI Cards */}
      <div className='reports-kpi-grid'>
        <KpiCard
          icon={<History size={20} />}
          label='Total Logs'
          color='blue'
          loading={loading}
          value={fmtNum(data?.summary?.totalLogs)}
        />
        <KpiCard
          icon={<Users size={20} />}
          label='Unique Users'
          color='purple'
          loading={loading}
          value={fmtNum(data?.summary?.uniqueUsers)}
        />
        <KpiCard
          icon={<Activity size={20} />}
          label='Action Types'
          color='green'
          loading={loading}
          value={fmtNum(actionChart.length)}
        />
      </div>

      {/* Charts */}
      {actionChart.length > 0 && (
        <div className='reports-chart-row'>
          <div className='reports-chart-card' style={{ gridColumn: '1 / -1' }}>
            <h3>Log Entries by Action Type</h3>
            <ResponsiveContainer width='100%' height={280}>
              <BarChart data={actionChart} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' />
                <XAxis dataKey='action' tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [fmtNum(v), 'Events']} />
                <Bar dataKey='count' radius={[4, 4, 0, 0]}>
                  {actionChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <ReportTable
        title='Audit Log Report List'
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
