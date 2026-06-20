import React from 'react';

/**
 * Badge — inline status chip
 *
 * variants: success | warning | danger | info | neutral | primary
 * sizes:    sm | md
 *
 * Colour spec (light theme):
 *   success  → #D1FAE5 bg / #065F46 text
 *   warning  → #FEF3C7 bg / #92400E text
 *   danger   → #FEE2E2 bg / #991B1B text
 *   info     → #DBEAFE bg / #1E40AF text   (also used for "approved"/"draft")
 *   primary  → #DBEAFE bg / #1E40AF text
 *   neutral  → #F1F5F9 bg / #475569 text
 */

const VARIANT_STYLES = {
  success: {
    backgroundColor: '#D1FAE5',
    color:           '#065F46',
  },
  warning: {
    backgroundColor: '#FEF3C7',
    color:           '#92400E',
  },
  danger: {
    backgroundColor: '#FEE2E2',
    color:           '#991B1B',
  },
  info: {
    backgroundColor: '#DBEAFE',
    color:           '#1E40AF',
  },
  primary: {
    backgroundColor: '#DBEAFE',
    color:           '#1E40AF',
  },
  neutral: {
    backgroundColor: '#F1F5F9',
    color:           '#475569',
  },
};

const SIZE_STYLES = {
  sm: { fontSize: 11, padding: '2px 7px',  borderRadius: 6,  fontWeight: 700, lineHeight: '16px' },
  md: { fontSize: 12, padding: '3px 10px', borderRadius: 6,  fontWeight: 700, lineHeight: '18px' },
};

const Badge = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  style: extraStyle = {},
  className = '',
  ...rest
}) => {
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;
  const sizeStyle    = SIZE_STYLES[size]        || SIZE_STYLES.sm;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? 5 : 0,
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        verticalAlign: 'middle',
        ...variantStyle,
        ...sizeStyle,
        ...extraStyle,
      }}
      {...rest}
    >
      {dot && (
        <span style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
};

export default Badge;
