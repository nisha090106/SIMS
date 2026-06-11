import React from 'react';

/**
 * Select — styled native dropdown
 *
 * <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
 *   <option value="">All</option>
 *   <option value="active">Active</option>
 * </Select>
 */
const Select = React.forwardRef(({
  label,
  helper,
  error,
  id,
  children,
  disabled = false,
  required = false,
  className = '',
  style: extra = {},
  containerStyle = {},
  ...selectProps
}, ref) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const hasError = Boolean(error);

  const borderColor = hasError ? 'var(--color-danger)' : 'var(--color-border)';

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
          htmlFor={selectId}
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

      <div style={{ position: 'relative' }}>
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          style={{
            width: '100%',
            height: 38,
            padding: '0 36px 0 12px',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-primary)',
            background: disabled ? 'var(--color-surface-alt)' : 'var(--color-surface)',
            border: `1px solid ${borderColor}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
            boxSizing: 'border-box',
            ...extra,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = hasError ? 'var(--color-danger)' : 'var(--color-primary)';
            e.target.style.boxShadow = hasError
              ? '0 0 0 3px rgba(220,38,38,0.12)'
              : '0 0 0 3px rgba(37,99,235,0.12)';
            selectProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = borderColor;
            e.target.style.boxShadow = 'none';
            selectProps.onBlur?.(e);
          }}
          {...selectProps}
        >
          {children}
        </select>

        {/* Chevron icon */}
        <span
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-text-muted)',
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ▼
        </span>
      </div>

      {(error || helper) && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: hasError ? 'var(--color-danger)' : 'var(--color-text-muted)',
          }}
        >
          {error || helper}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
