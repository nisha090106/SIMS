import React from 'react';

/**
 * Button
 * variants: primary | secondary | ghost | danger
 * sizes: sm | md | lg
 */

const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontFamily: 'var(--font-sans)',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  borderRadius: 'var(--radius-md)',
  transition:
    'background var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-base)',
  outline: 'none',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const VARIANTS = {
  primary: {
    background: 'var(--color-primary)',
    color: '#fff',
    boxShadow: '0 1px 3px rgba(37,99,235,0.25)',
    border: '1px solid transparent',
    '--hover-bg': 'var(--color-primary-dark)',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)',
    '--hover-bg': 'var(--color-surface-alt)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid transparent',
    boxShadow: 'none',
    '--hover-bg': 'var(--color-surface-alt)',
  },
  danger: {
    background: 'var(--color-danger)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 3px rgba(220,38,38,0.25)',
    '--hover-bg': '#b91c1c',
  },
  'danger-ghost': {
    background: 'transparent',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
    boxShadow: 'none',
    '--hover-bg': 'var(--color-danger-soft)',
  },
};

const SIZES = {
  sm: { fontSize: 'var(--text-sm)', padding: '6px 12px', lineHeight: '1' },
  md: { fontSize: 'var(--text-base)', padding: '8px 16px', lineHeight: '1' },
  lg: { fontSize: 'var(--text-lg)', padding: '11px 22px', lineHeight: '1' },
};

const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      leftIcon = null,
      rightIcon = null,
      fullWidth = false,
      style: extraStyle = {},
      className = '',
      onClick,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const variantStyle = VARIANTS[variant] || VARIANTS.primary;
    const sizeStyle = SIZES[size] || SIZES.md;

    const [hovered, setHovered] = React.useState(false);

    const computedStyle = {
      ...BASE,
      ...variantStyle,
      ...sizeStyle,
      opacity: disabled || loading ? 0.58 : 1,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      width: fullWidth ? '100%' : undefined,
      ...(hovered && !disabled && !loading
        ? { background: variantStyle['--hover-bg'] || variantStyle.background }
        : {}),
      ...extraStyle,
    };

    // clean up the css variable key before spreading onto DOM
    delete computedStyle['--hover-bg'];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={className}
        style={computedStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        {...rest}
      >
        {loading ? (
          <>
            <SpinnerInline size={size} />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{leftIcon}</span>}
            {children}
            {rightIcon && (
              <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>
            )}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

/* Tiny inline spinner used inside button when loading */
const SpinnerInline = ({ size }) => {
  const dim = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  return (
    <span
      style={{
        width: dim,
        height: dim,
        border: '2px solid rgba(255,255,255,0.35)',
        borderTopColor: 'currentColor',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'btn-spin 0.65s linear infinite',
        flexShrink: 0,
      }}
    />
  );
};

/* Inject keyframe once */
if (typeof document !== 'undefined') {
  const id = '__sims-btn-spin__';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes btn-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}

export default Button;
