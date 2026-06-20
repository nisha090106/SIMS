import React from 'react';
import { Download, RefreshCw } from 'lucide-react';

/**
 * FilterBar — reusable filter strip used in every report tab
 *
 * Props:
 *   children   — filter fields (inputs, selects) rendered on the left
 *   onApply    — called when the Apply button is clicked
 *   onExport   — called when the CSV Export button is clicked (omit to hide)
 *   loading    — disables buttons while data is loading
 */
export default function FilterBar({ children, onApply, onExport, loading = false }) {
  return (
    <div className="reports-filter-bar">
      {children}

      <div className="filter-actions">
        <button
          className="filter-btn primary"
          onClick={onApply}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Apply'}
        </button>

        {onExport && (
          <button className="filter-btn outline" onClick={onExport} disabled={loading}>
            <Download size={14} />
            Export CSV
          </button>
        )}
      </div>
    </div>
  );
}

/** Small labelled field wrapper */
export function FilterField({ label, children }) {
  return (
    <div className="filter-field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
