import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip — light tooltip, positions above/below/left/right
 *
 * <Tooltip content="Delete item" placement="top">
 *   <button>Delete</button>
 * </Tooltip>
 */

const Tooltip = ({ children, content, placement = 'top', delay = 120, disabled = false }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timerRef = useRef(null);
  const tooltipRef = useRef(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    if (visible && triggerRef.current && tooltipRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tip = tooltipRef.current.getBoundingClientRect();
      const gap = 6;
      let top, left;

      switch (placement) {
        case 'bottom':
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tip.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tip.height / 2;
          left = rect.left - tip.width - gap;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tip.height / 2;
          left = rect.right + gap;
          break;
        default: // top
          top = rect.top - tip.height - gap;
          left = rect.left + rect.width / 2 - tip.width / 2;
      }

      // Clamp to viewport
      left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));
      top = Math.max(8, top);

      setCoords({ top: top + window.scrollY, left: left + window.scrollX });
    }
  }, [visible, placement]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!content || disabled) return <>{children}</>;

  const child = React.Children.only(children);

  return (
    <>
      {React.cloneElement(child, {
        ref: triggerRef,
        onMouseEnter: (e) => {
          show();
          child.props.onMouseEnter?.(e);
        },
        onMouseLeave: (e) => {
          hide();
          child.props.onMouseLeave?.(e);
        },
        onFocus: (e) => {
          show();
          child.props.onFocus?.(e);
        },
        onBlur: (e) => {
          hide();
          child.props.onBlur?.(e);
        },
      })}

      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role='tooltip'
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              zIndex: 9000,
              background: 'var(--color-text-primary)',
              color: '#fff',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              padding: '5px 9px',
              borderRadius: 'var(--radius-sm)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-elevated)',
              animation: 'tooltip-in 0.12s ease',
            }}
          >
            {content}
          </div>,
          document.body,
        )}

      <style>{`@keyframes tooltip-in { from { opacity:0; transform:scale(0.94) } to { opacity:1; transform:scale(1) } }`}</style>
    </>
  );
};

export default Tooltip;
