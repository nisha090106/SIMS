// Shared helpers for Purchase Order pages

export const STATUS_ORDER = ['draft','submitted','approved','shipped','received','cancelled'];

export const STATUS_CONFIG = {
  draft:     { label: 'Draft',     variant: 'neutral',  color: '#64748B' },
  submitted: { label: 'Submitted', variant: 'info',     color: '#0891B2' },
  approved:  { label: 'Approved',  variant: 'primary',  color: '#2563EB' },
  shipped:   { label: 'Shipped',   variant: 'warning',  color: '#D97706' },
  received:  { label: 'Received',  variant: 'success',  color: '#16A34A' },
  cancelled: { label: 'Cancelled', variant: 'danger',   color: '#DC2626' },
};

export const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function parseItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export function calcTotals(items = [], taxPercent = 0) {
  const subtotal   = items.reduce((s, i) => s + (Number(i.total_cost) || (Number(i.quantity) * Number(i.unit_cost)) || 0), 0);
  const taxAmount  = subtotal * (Number(taxPercent) / 100);
  const grandTotal = subtotal + taxAmount;
  return { subtotal, taxAmount, grandTotal };
}

export function userName(u) {
  if (!u) return '—';
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
}
