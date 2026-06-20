import React from 'react';

/**
 * StatusBadge — maps any status/type string to a standardised
 * colour chip. Covers order statuses, stock levels, user states,
 * request states, and any custom value via the `colorMap` prop.
 *
 * Usage:
 *   <StatusBadge status="fulfilled" />
 *   <StatusBadge status="low_stock" />
 *   <StatusBadge status={po.status} />
 *
 * Props:
 *   status    {string}  — the status value to display
 *   label     {string}  — optional override label (defaults to humanised status)
 *   size      {'sm'|'md'|'lg'} — defaults to 'sm'
 *   dot       {boolean} — show a leading colour dot
 *   style     {object}  — extra inline styles
 *   className {string}
 */

// ─── Colour map ───────────────────────────────────────────────────────────────
// Each entry: [background, text-color]
const COLOR_MAP = {
  // ── Success / positive ──────────────────────────
  fulfilled:   ['#D1FAE5', '#065F46'],
  active:      ['#D1FAE5', '#065F46'],
  in_stock:    ['#D1FAE5', '#065F46'],
  available:   ['#D1FAE5', '#065F46'],
  received:    ['#D1FAE5', '#065F46'],
  delivered:   ['#D1FAE5', '#065F46'],
  completed:   ['#D1FAE5', '#065F46'],
  resolved:    ['#D1FAE5', '#065F46'],
  success:     ['#D1FAE5', '#065F46'],

  // ── Warning / in-progress ────────────────────────
  pending:     ['#FEF3C7', '#92400E'],
  low_stock:   ['#FEF3C7', '#92400E'],
  submitted:   ['#FEF3C7', '#92400E'],
  shipped:     ['#FEF3C7', '#92400E'],
  dispatched:  ['#FEF3C7', '#92400E'],
  processing:  ['#FEF3C7', '#92400E'],
  warning:     ['#FEF3C7', '#92400E'],

  // ── Danger / negative ───────────────────────────
  cancelled:   ['#FEE2E2', '#991B1B'],
  inactive:    ['#FEE2E2', '#991B1B'],
  out_of_stock:['#FEE2E2', '#991B1B'],
  rejected:    ['#FEE2E2', '#991B1B'],
  expired:     ['#FEE2E2', '#991B1B'],
  failed:      ['#FEE2E2', '#991B1B'],
  blacklisted: ['#FEE2E2', '#991B1B'],
  error:       ['#FEE2E2', '#991B1B'],

  // ── Info / neutral ──────────────────────────────
  approved:    ['#DBEAFE', '#1E40AF'],
  draft:       ['#DBEAFE', '#1E40AF'],
  info:        ['#DBEAFE', '#1E40AF'],
  review:      ['#DBEAFE', '#1E40AF'],
  auto:        ['#DBEAFE', '#1E40AF'],

  // ── Neutral fallback ────────────────────────────
  unknown:     ['#F1F5F9', '#475569'],
  default:     ['#F1F5F9', '#475569'],
};

// ─── Size map ────────────────────────────────────────────────────────────────
const SIZE_STYLES = {
  sm: { fontSize: 11, padding: '2px 8px',  borderRadius: 6, fontWeight: 700, height: 20 },
  md: { fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 700, height: 22 },
  lg: { fontSize: 13, padding: '4px 12px', borderRadius: 8, fontWeight: 700, height: 26 },
};

// ─── Label humaniser ─────────────────────────────────────────────────────────
function humanise(status) {
  if (!status) return '';
  return String(status)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function StatusBadge({
  status,
  label,
  size = 'sm',
  dot = false,
  style: extraStyle = {},
  className = '',
  ...rest
}) {
  const key = String(status || '').toLowerCase().trim();
  const [bg, color] = COLOR_MAP[key] || COLOR_MAP.default;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? 5 : 0,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        fontFamily: "'Inter', -apple-system, sans-serif",
        verticalAlign: 'middle',
        backgroundColor: bg,
        color,
        ...sizeStyle,
        ...extraStyle,
      }}
      {...rest}
    >
      {dot && (
        <span style={{
          width: 5, height: 5,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          flexShrink: 0,
        }} />
      )}
      {label ?? humanise(status)}
    </span>
  );
}
