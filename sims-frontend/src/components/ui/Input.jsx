import React from 'react';

/**
 * Input — text input with label, helper text, error state, left/right icon slots
 *
 * <Input
 *   label="Email"
 *   placeholder="you@example.com"
 *   leftIcon={<EmailIcon />}
 *   error="Email is required"
 *   helper="We'll never share your email"
 * />
 */
const Input = React.forwardRef(({
  label,
  helper,
  error,
  leftIcon,
  rightIcon,
  id,
  className = '',
  style: extra = {},
  disabled = false,
  required = false,
  containerStyle = {},
  ...inputProps
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const hasError = Boolean(error);

  const borderColor = hasError
    ? 'var(--color-danger)'
    : 'var(--color-border)';

  const focusStyle = hasError
    ? '0 0 0 3px rgba(220,38,38,0.12)'
    : '0 0 0 3px rgba(37,99,235,0.12)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontFamily: 'var(--font-sans)',
        ...containerStyle,
      }}
      className={className}
    >
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: hasError ? 'var(--color-danger)' : 'var(--color-text-primary)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>
          )}
        </label>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              fontSize: 16,
            }}
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          style={{
            width: '100%',
            height: 38,
            padding: `0 ${rightIcon ? 36 : 12}px 0 ${leftIcon ? 36 : 12}px`,
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-primary)',
            background: disabled ? 'var(--color-surface-alt)' : 'var(--color-surface)',
            border: `1px solid ${borderColor}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
            boxSizing: 'border-box',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            ...extra,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = hasError ? 'var(--color-danger)' : 'var(--color-primary)';
            e.target.style.boxShadow = focusStyle;
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = borderColor;
            e.target.style.boxShadow = 'none';
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />

        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightIcon}
          </span>
        )}
      </div>

      {(error || helper) && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: hasError ? 'var(--color-danger)' : 'var(--color-text-muted)',
            lineHeight: 1.4,
          }}
        >
          {error || helper}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
