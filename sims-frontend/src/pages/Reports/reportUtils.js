/**
 * Shared utilities for the Reports module.
 */

/** Download a Blob object as a file */
export function downloadBlob(data, filename) {
  const url = URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Format a number as USD currency */
export function fmtCurrency(n, opts = {}) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
    ...opts,
  }).format(Number(n));
}

/** Format a plain number with commas */
export function fmtNum(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString();
}

/** Format a date string to locale date */
export function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Format a datetime string */
export function fmtDateTime(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * STATUS_PILL — maps a status string to a CSS class
 * Used in table cells: <span className={`status-pill ${STATUS_PILL[status] ?? 'draft'}`}>{status}</span>
 */
export const STATUS_PILL = {
  draft:      'draft',
  pending:    'pending',
  submitted:  'pending',
  approved:   'approved',
  shipped:    'dispatched',
  dispatched: 'dispatched',
  received:   'received',
  delivered:  'delivered',
  completed:  'delivered',
  cancelled:  'cancelled',
  rejected:   'rejected',
  fulfilled:  'fulfilled',
  in_stock:   'delivered',
  low_stock:  'pending',
  out_of_stock: 'cancelled',
};

/** Recharts dark tooltip style, matches SIMS design */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0F172A', border: 'none',
    borderRadius: 8, fontSize: 12, color: '#F8FAFC',
  },
  itemStyle:  { color: '#F8FAFC' },
  labelStyle: { color: '#94A3B8', fontWeight: 700 },
};

export const CHART_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6',
  '#f43f5e','#06b6d4','#84cc16','#e879f9',
];
