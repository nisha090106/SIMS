import React, { useCallback, useEffect, useReducer, useState } from 'react';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  DownloadOutlined as DownloadIcon,
  RefreshOutlined as RefreshIcon,
  HistoryOutlined as HistoryIcon,
} from '@mui/icons-material';
import { importAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';

/* ── helpers ─────────────────────────────────────────────────── */
const fmtDT = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const statusVariant = (s) => ({
  completed: 'success', failed: 'danger', processing: 'info', pending: 'warning',
}[s] || 'neutral');

const typeLabel = (t) => (t || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function userName(u) {
  if (!u) return 'System';
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
}

function downloadErrorCSV(job) {
  const errors = job.error_log;
  if (!errors?.length) return;
  const lines = [
    'Row,Error',
    ...errors.map((e) => `${e.row ?? ''},${JSON.stringify(e.error ?? e.message ?? '')}`),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `import-${job.id}-errors.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── reducer ─────────────────────────────────────────────────── */
const INIT = { jobs: [], loading: true };
function reducer(s, a) {
  switch (a.type) {
    case 'START': return { ...s, loading: true };
    case 'OK':    return { loading: false, jobs: a.jobs };
    case 'ERR':   return { ...s, loading: false };
    default:      return s;
  }
}

/* ══════════════════════════════════════════════════════════════
   ImportHistory
══════════════════════════════════════════════════════════════ */
const formatImportError = (err, jobType) => {
  const errMsg = err.error || err.message || '';
  if (jobType !== 'stock' && jobType !== 'stock_import') {
    return errMsg;
  }
  
  const raw = err.rawData || {};
  const sku = raw.SKU || raw.sku || '';
  const whCode = raw.WarehouseCode || raw.warehouse_code || raw.warehousecode || '';

  if (errMsg.toLowerCase().includes('product not found') || errMsg.toLowerCase().includes('sku')) {
    return `SKU ${sku} not found in products table (row skipped)`;
  }
  if (errMsg.toLowerCase().includes('warehouse') && errMsg.toLowerCase().includes('not found')) {
    return `Warehouse ${whCode || 'unknown'} not found (row skipped)`;
  }
  if (errMsg.toLowerCase().includes('expiry') || errMsg.toLowerCase().includes('expirydate')) {
    return `ExpiryDate — value is empty (stored as null, row succeeded)`;
  }
  return errMsg;
};

export default function ImportHistory({ refreshTrigger }) {
  const [state, dispatch] = useReducer(reducer, INIT);
  const [typeFilter, setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId]   = useState(null);

  const fetchHistory = useCallback(async () => {
    dispatch({ type: 'START' });
    try {
      const params = {};
      if (typeFilter)   params.import_type = typeFilter;
      if (statusFilter) params.status      = statusFilter;
      const res = await importAPI.getHistory(params);
      dispatch({ type: 'OK', jobs: res.data.data || [] });
    } catch {
      dispatch({ type: 'ERR' });
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory, refreshTrigger]);

  const { jobs, loading } = state;

  const tdStyle = {
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-border)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    verticalAlign: 'middle',
  };

  return (
    <Card
      title="Import History"
      subtitle="Last 30 import jobs"
      action={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Filters */}
          <div style={{ width: 130 }}>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="product">Products</option>
              <option value="stock">Inventory</option>
              <option value="warehouse">Warehouses</option>
            </Select>
          </div>
          <div style={{ width: 120 }}>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </Select>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshIcon style={{ fontSize: 16 }} />} onClick={fetchHistory} loading={loading}>
            Refresh
          </Button>
        </div>
      }
      padding={false}
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24, color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>
          <Spinner size="sm" /> Loading history…
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>
          <HistoryIcon style={{ fontSize: 36, marginBottom: 8, opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
          No import jobs yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['File Name', 'Type', 'Date', 'Total', 'Success', 'Failed', 'Status', 'Imported By', ''].map((h) => (
                  <th key={h} style={{
                    ...tdStyle,
                    background: 'var(--color-surface-alt)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const isExpanded = expandedId === job.id;
                const hasErrors  = Array.isArray(job.error_log) && job.error_log.length > 0;

                return (
                  <React.Fragment key={job.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      {/* File name */}
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {job.file_name}
                        </span>
                      </td>
                      {/* Type */}
                      <td style={tdStyle}>
                        <Badge variant="neutral" size="sm">{typeLabel(job.job_type)}</Badge>
                      </td>
                      {/* Date */}
                      <td style={{ ...tdStyle, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDT(job.created_at)}
                      </td>
                      {/* Total */}
                      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {job.total_rows}
                      </td>
                      {/* Success */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                          {job.processed_rows}
                        </span>
                      </td>
                      {/* Failed */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: job.failed_rows > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {job.failed_rows}
                        </span>
                      </td>
                      {/* Status */}
                      <td style={tdStyle}>
                        <Badge variant={statusVariant(job.status)} size="sm" dot>{job.status}</Badge>
                      </td>
                      {/* User */}
                      <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                        {userName(job.triggeredBy)}
                      </td>
                      {/* Actions */}
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                          {hasErrors && (
                            <button
                              onClick={() => downloadErrorCSV(job)}
                              title="Download error CSV"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--color-danger)', display: 'flex', alignItems: 'center',
                                padding: 4, borderRadius: 'var(--radius-sm)',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-danger-soft)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                            >
                              <DownloadIcon style={{ fontSize: 16 }} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : job.id); }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center',
                              padding: 4, borderRadius: 'var(--radius-sm)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            {isExpanded ? <CollapseIcon style={{ fontSize: 18 }} /> : <ExpandIcon style={{ fontSize: 18 }} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded error detail row ── */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--color-border)' }}>
                          <div style={{
                            padding: '16px 20px',
                            background: 'var(--color-surface-alt)',
                            borderTop: '1px solid var(--color-border)',
                          }}>
                            {/* Summary pills */}
                            <div style={{ display: 'flex', gap: 12, marginBottom: hasErrors ? 14 : 0, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
                                Job #{job.id}
                              </span>
                              <Pill label="Total"   value={job.total_rows}     color="#64748B" />
                              <Pill label="Success" value={job.processed_rows} color="var(--color-success)" />
                              <Pill label="Failed"  value={job.failed_rows}    color={job.failed_rows > 0 ? 'var(--color-danger)' : '#64748B'} />
                              {job.started_at && (
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
                                  Started: {fmtDT(job.started_at)} · Finished: {fmtDT(job.completed_at)}
                                </span>
                              )}
                            </div>

                            {/* Error list */}
                            {!hasErrors ? (
                              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-success)', fontFamily: 'var(--font-sans)' }}>
                                ✓ No errors — all rows imported successfully.
                              </p>
                            ) : (
                              <div style={{
                                maxHeight: 200,
                                overflowY: 'auto',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface)',
                              }}>
                                {job.error_log.map((e, i) => (
                                  <div key={i} style={{
                                    display: 'flex', gap: 10, padding: '7px 12px',
                                    borderBottom: i < job.error_log.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    alignItems: 'flex-start',
                                  }}>
                                    <span style={{
                                      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
                                      background: 'var(--color-danger-soft)', color: 'var(--color-danger)',
                                      padding: '1px 6px', borderRadius: 4, flexShrink: 0, fontWeight: 700,
                                    }}>
                                      Row {e.row ?? i + 1}
                                    </span>
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>
                                      {formatImportError(e, job.job_type)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Pill({ label, value, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 'var(--text-xs)', fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-secondary)',
    }}>
      {label}:
      <strong style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</strong>
    </span>
  );
}
