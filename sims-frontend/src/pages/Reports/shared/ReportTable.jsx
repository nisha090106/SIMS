import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * ReportTable — server-side OR client-side paginated table
 *
 * For server-side pagination pass:
 *   serverPage, serverPages, serverTotal, onPageChange
 *
 * For client-side pagination omit the above (rows are sliced in component)
 */
export default function ReportTable({
  title,
  columns = [],
  rows = [],
  loading = false,
  pageSize = 15,
  // server-side pagination
  serverPage,
  serverPages,
  serverTotal,
  onPageChange,
}) {
  const isServer = onPageChange !== undefined;

  const [clientPage, setClientPage] = useState(0);
  useEffect(() => { setClientPage(0); }, [rows]);

  const page       = isServer ? (serverPage - 1) : clientPage;
  const totalPages = isServer ? serverPages : Math.ceil(rows.length / pageSize);
  const total      = isServer ? serverTotal : rows.length;

  const displayRows = isServer
    ? rows
    : rows.slice(page * pageSize, (page + 1) * pageSize);

  const goTo = (p) => {
    if (isServer) { onPageChange(p + 1); }
    else          { setClientPage(p); }
  };

  const pageStart = page * pageSize + 1;
  const pageEnd   = Math.min((page + 1) * pageSize, total);

  /* ── build page numbers ── */
  const pages = [];
  const window = 5;
  let start = Math.max(0, Math.min(page - 2, totalPages - window));
  for (let i = start; i < Math.min(start + window, totalPages); i++) pages.push(i);

  return (
    <div className="reports-table-card">
      <div className="reports-table-header">
        <h3>{title}</h3>
        <span className="table-badge">{total?.toLocaleString()} records</span>
      </div>

      <div className="reports-table-wrap">
        <table className="reports-data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.align === 'right' ? 'right' : ''} style={c.width ? { width: c.width } : {}}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      <div style={{ height: 14, borderRadius: 4, background: '#f1f5f9', width: '70%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: 48, color: '#000000', fontSize: 14 }}>
                  No data found for the selected filters.
                </td>
              </tr>
            ) : (
              displayRows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === 'right' ? 'right' : ''}>
                      {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="reports-pagination">
          <span className="page-info">
            Showing {pageStart}–{pageEnd} of {total?.toLocaleString()}
          </span>
          <div className="page-buttons">
            <button className="page-btn" disabled={page === 0} onClick={() => goTo(page - 1)}>
              <ChevronLeft size={14} />
            </button>
            {pages.map((p) => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => goTo(p)}>
                {p + 1}
              </button>
            ))}
            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => goTo(page + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
