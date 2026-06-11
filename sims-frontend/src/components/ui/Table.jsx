import React from 'react';
import Spinner from './Spinner';

/**
 * Table — sortable headers, loading skeleton, empty state
 *
 * <Table
 *   columns={[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'status', label: 'Status', align: 'center' },
 *     { key: 'actions', label: '', align: 'right', width: 100 },
 *   ]}
 *   data={rows}
 *   loading={false}
 *   emptyText="No products found"
 *   sortKey="name"
 *   sortDir="asc"
 *   onSort={(key) => …}
 *   renderRow={(row, idx) => <tr key={row.id}>…</tr>}
 * />
 */

const SKELETON_ROWS = 5;

const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyText = 'No records found.',
  emptyIcon = null,
  sortKey = null,
  sortDir = 'asc',
  onSort,
  renderRow,
  stickyHeader = false,
  style: extra = {},
}) => {
  const thBase = {
    padding: '10px 16px',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: 'var(--color-surface-alt)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    fontFamily: 'var(--font-sans)',
    position: stickyHeader ? 'sticky' : 'static',
    top: stickyHeader ? 0 : 'auto',
    zIndex: stickyHeader ? 1 : 'auto',
  };

  const tdBase = {
    padding: '11px 16px',
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-primary)',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
    fontFamily: 'var(--font-sans)',
  };

  const handleSort = (col) => {
    if (col.sortable && onSort) onSort(col.key);
  };

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        ...extra,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'auto',
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...thBase,
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                  cursor: col.sortable ? 'pointer' : 'default',
                }}
                onClick={() => handleSort(col)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {col.label}
                  {col.sortable && (
                    <span style={{ opacity: sortKey === col.key ? 1 : 0.35, fontSize: 10 }}>
                      {sortKey === col.key && sortDir === 'desc' ? '▼' : '▲'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            /* Skeleton rows */
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr key={`skel-${i}`}>
                {columns.map((col) => (
                  <td key={col.key} style={{ ...tdBase }}>
                    <div
                      style={{
                        height: 14,
                        borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'sims-skeleton 1.4s ease infinite',
                        width: col.skeletonWidth || '70%',
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            /* Empty state */
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  ...tdBase,
                  textAlign: 'center',
                  padding: '48px 16px',
                  color: 'var(--color-text-muted)',
                  borderBottom: 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {emptyIcon && (
                    <span style={{ fontSize: 32, opacity: 0.35 }}>{emptyIcon}</span>
                  )}
                  <span style={{ fontSize: 'var(--text-base)' }}>{emptyText}</span>
                </div>
              </td>
            </tr>
          ) : (
            /* Data rows */
            data.map((row, idx) => renderRow(row, idx))
          )}
        </tbody>
      </table>

      {/* Inject skeleton animation */}
      <style>{`
        @keyframes sims-skeleton {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
    </div>
  );
};

export default Table;
