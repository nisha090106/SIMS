import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal — accessible modal with backdrop blur
 *
 * <Modal open={open} onClose={() => setOpen(false)} title="Edit Product" size="md">
 *   <Modal.Body>…</Modal.Body>
 *   <Modal.Footer>…</Modal.Footer>
 * </Modal>
 */

const SIZES = {
  sm: 420,
  md: 560,
  lg: 720,
  xl: 900,
  full: '95vw',
};

/* ── Sub-components ── */
const Body = ({ children, style: extra = {} }) => (
  <div
    style={{
      padding: '20px 24px',
      overflowY: 'auto',
      flex: 1,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--color-text-primary)',
      ...extra,
    }}
  >
    {children}
  </div>
);

const Footer = ({ children, style: extra = {} }) => (
  <div
    style={{
      padding: '14px 24px',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      fontFamily: 'var(--font-sans)',
      ...extra,
    }}
  >
    {children}
  </div>
);

/* ── Modal root ── */
const Modal = ({
  open,
  onClose,
  title,
  size = 'md',
  children,
  closeOnBackdrop = true,
  style: extra = {},
}) => {
  // Close on Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && open) onClose?.();
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  const maxWidth = SIZES[size] || SIZES.md;

  const modal = (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={title || 'Dialog'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={closeOnBackdrop ? onClose : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'modal-fade-in 0.15s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modal-slide-up 0.18s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          ...extra,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {title}
            </h3>
            <button
              aria-label='Close dialog'
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                fontSize: 18,
                lineHeight: 1,
                padding: 0,
                transition: 'background var(--transition-base)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              ✕
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

Modal.Body = Body;
Modal.Footer = Footer;

/* Inject animations once */
if (typeof document !== 'undefined') {
  const id = '__sims-modal-anim__';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes modal-fade-in { from { opacity:0 } to { opacity:1 } }
      @keyframes modal-slide-up { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
    `;
    document.head.appendChild(s);
  }
}

export default Modal;
