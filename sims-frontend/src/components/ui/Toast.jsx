import React, { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ToastContext from '../../context/ToastContext';

/**
 * Toast notification system
 * variants: success | error | warning | info
 *
 * Renders into document.body via portal.
 * Each toast animates in and auto-dismisses.
 */

const VARIANT_CONFIG = {
  success: {
    bg: 'var(--color-success-soft)',
    border: '#bbf7d0',
    iconColor: 'var(--color-success)',
    icon: '✓',
  },
  error: {
    bg: 'var(--color-danger-soft)',
    border: '#fecaca',
    iconColor: 'var(--color-danger)',
    icon: '✕',
  },
  warning: {
    bg: 'var(--color-warning-soft)',
    border: '#fde68a',
    iconColor: 'var(--color-warning)',
    icon: '⚠',
  },
  info: {
    bg: 'var(--color-info-soft)',
    border: '#a5f3fc',
    iconColor: 'var(--color-info)',
    icon: 'ℹ',
  },
};

const ToastItem = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const config = VARIANT_CONFIG[toast.type] || VARIANT_CONFIG.info;

  return (
    <div
      role='alert'
      aria-live='assertive'
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        background: 'var(--color-surface)',
        border: `1px solid ${config.border}`,
        borderLeft: `4px solid ${config.iconColor}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-elevated)',
        minWidth: 300,
        maxWidth: 420,
        fontFamily: 'var(--font-sans)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(20px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        pointerEvents: 'all',
      }}
    >
      {/* Icon */}
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: config.bg,
          color: config.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {config.icon}
      </span>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.45,
          wordBreak: 'break-word',
        }}
      >
        {toast.message}
      </span>

      {/* Close */}
      <button
        aria-label='Dismiss notification'
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        ✕
      </button>
    </div>
  );
};

const UIToast = () => {
  const { toasts, removeToast } = useContext(ToastContext);

  if (!toasts?.length) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    document.body,
  );
};

export default UIToast;
