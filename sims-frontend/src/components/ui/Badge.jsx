import React from 'react';

/**
 * Badge — inline status chip
 * variants: success | warning | danger | info | neutral
 * sizes: sm | md
 */
const VARIANT_STYLES = {
  success: {
    background: 'var(--color-success-soft)',
    color: 'var(--color-success)',
    border: '1px solid #bbf7d0',
  },
  warning: {
    background: 'var(--color-warning-soft)',
    color: 'var(--color-warning)',
    border: '1px solid #fde68a',
  },
  danger: {
    background: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
    border: '1px solid #fecaca',
  },
  info: {
    background: 'var(--color-info-soft)',
    color: 'var(--color-info)',
    border: '1px solid #a5f3fc',
  },
  neutral: {
    background: 'var(--color-surface-alt)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  },
  primary: {
    background: 'var(--color-primary-soft)',
    color: 'var(--color-primary)',
    border: '1px solid #bfdbfe',
  },
};

const SIZE_STYLES = {
  sm: { fontSize: 'var(--text-xs)', padding: '2px 7px', borderRadius: 'var(--radius-sm)' },
  md: { fontSize: 'var(--text-sm)', padding: '3px 9px', borderRadius: 'var(--radius-md)' },
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
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? 5 : 0,
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        ...variantStyle,
        ...sizeStyle,
        ...extraStyle,
      }}
      {...rest}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
