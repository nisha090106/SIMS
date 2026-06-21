import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircleOutline as OkIcon,
  ErrorOutline as ErrIcon,
  HourglassEmpty as WaitIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  DownloadOutlined as DownloadIcon,
} from '@mui/icons-material';
import { importAPI } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

/**
 * ImportProgress
 *
 * Props:
 *   jobId      — import job ID to poll
 *   onComplete — called when job finishes (job object passed)
 */
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

export default function ImportProgress({ jobId, onComplete }) {
  const [job, setJob] = useState(null);
  const [errOpen, setErrOpen] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await importAPI.getJobStatus(jobId);
        const data = res.data.data;
        setJob(data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(intervalRef.current);
          onComplete?.(data);
        }
      } catch (err) {
        clearInterval(intervalRef.current);
      }
    };

    poll(); // immediate first call
    intervalRef.current = setInterval(poll, 2000);
    return () => clearInterval(intervalRef.current);
  }, [jobId, onComplete]);

  if (!job) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '20px 0',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
        }}
      >
        <Spinner size='sm' /> Queuing import…
      </div>
    );
  }

  const isDone = job.status === 'completed' || job.status === 'failed';
  const pct = job.progress_pct ?? (isDone ? 100 : 0);
  const hasErrors = Array.isArray(job.error_log) && job.error_log.length > 0;
  const successCount = job.processed_rows ?? 0;
  const failCount = job.failed_rows ?? 0;
  const totalCount = job.total_rows ?? 0;

  /* ── Download error report as CSV ── */
  function downloadErrors() {
    if (!hasErrors) return;
    const lines = [
      'Row,Error',
      ...job.error_log.map((e) => `${e.row ?? ''},${JSON.stringify(e.error ?? e.message ?? '')}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-${jobId}-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Color by status ── */
  const barColor =
    job.status === 'failed'
      ? 'var(--color-danger)'
      : failCount > 0
        ? 'var(--color-warning)'
        : 'var(--color-success)';

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'var(--color-surface-alt)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {!isDone && <Spinner size='sm' />}
        {isDone && job.status === 'completed' && (
          <OkIcon
            style={{
              color: failCount > 0 ? 'var(--color-warning)' : 'var(--color-success)',
              fontSize: 20,
            }}
          />
        )}
        {isDone && job.status === 'failed' && (
          <ErrIcon style={{ color: 'var(--color-danger)', fontSize: 20 }} />
        )}
        {!isDone && job.status === 'pending' && (
          <WaitIcon style={{ color: 'var(--color-text-muted)', fontSize: 20 }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {job.file_name}
          </p>
          <p
            style={{
              margin: '1px 0 0',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            Job #{job.id}
          </p>
        </div>

        <Badge
          variant={
            job.status === 'completed'
              ? failCount > 0
                ? 'warning'
                : 'success'
              : job.status === 'failed'
                ? 'danger'
                : 'info'
          }
          size='sm'
        >
          {job.status}
        </Badge>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ padding: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>
            Processed {successCount + failCount} of {totalCount} rows
          </span>
          <span style={{ fontWeight: 700 }}>{pct}%</span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: 'var(--color-surface-alt)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: barColor,
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* ── Summary stats (shown once done) ── */}
        {isDone && (
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            <StatChip label='Total Rows' value={totalCount} color='neutral' />
            <StatChip label='Succeeded' value={successCount} color='success' />
            <StatChip
              label='Failed'
              value={failCount}
              color={failCount > 0 ? 'danger' : 'neutral'}
            />
          </div>
        )}

        {/* ── Error accordion ── */}
        {isDone && hasErrors && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <button
                onClick={() => setErrOpen((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-danger)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {errOpen ? (
                  <CollapseIcon style={{ fontSize: 18 }} />
                ) : (
                  <ExpandIcon style={{ fontSize: 18 }} />
                )}
                {errOpen ? 'Hide' : 'Show'} {job.error_log.length} row error
                {job.error_log.length !== 1 ? 's' : ''}
              </button>

              <Button
                variant='ghost'
                size='sm'
                leftIcon={<DownloadIcon style={{ fontSize: 15 }} />}
                onClick={downloadErrors}
              >
                Download Error CSV
              </Button>
            </div>

            {errOpen && (
              <div
                style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {job.error_log.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '8px 12px',
                      borderBottom:
                        i < job.error_log.length - 1 ? '1px solid var(--color-border)' : 'none',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        background: 'var(--color-danger-soft)',
                        color: 'var(--color-danger)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-sm)',
                        flexShrink: 0,
                        fontWeight: 600,
                      }}
                    >
                      Row {e.row ?? i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-sans)',
                        lineHeight: 1.4,
                      }}
                    >
                      {formatImportError(e, job.job_type)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value, color = 'neutral' }) {
  const colorMap = {
    success: { bg: 'var(--color-success-soft)', text: 'var(--color-success)' },
    danger: { bg: 'var(--color-danger-soft)', text: 'var(--color-danger)' },
    neutral: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  };
  const c = colorMap[color] || colorMap.neutral;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px 14px',
        borderRadius: 'var(--radius-md)',
        background: c.bg,
        minWidth: 72,
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 800,
          color: c.text,
          fontFamily: 'var(--font-sans)',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
          marginTop: 2,
        }}
      >
        {label}
      </span>
    </div>
  );
}
