import React from 'react';

/**
 * Spinner — three sizes: sm | md | lg
 * color defaults to --color-primary; override with `color` prop
 */
const SIZES = {
  sm: { size: 16, border: 2 },
  md: { size: 28, border: 3 },
  lg: { size: 44, border: 4 },
};

const Spinner = ({
  size = 'md',
  color = 'var(--color-primary)',
  style: extra = {},
  label = 'Loading…',
}) => {
  const { size: dim, border } = SIZES[size] || SIZES.md;

  return (
    <span
      role='status'
      aria-label={label}
      style={{
        display: 'inline-block',
        width: dim,
        height: dim,
        borderRadius: '50%',
        border: `${border}px solid rgba(0,0,0,0.08)`,
        borderTopColor: color,
        animation: 'sims-spin 0.7s linear infinite',
        flexShrink: 0,
        ...extra,
      }}
    />
  );
};

/* Inject keyframe once */
if (typeof document !== 'undefined') {
  const id = '__sims-spin__';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `@keyframes sims-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(s);
  }
}

export default Spinner;
