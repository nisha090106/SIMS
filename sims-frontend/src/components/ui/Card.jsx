import React from 'react';

/**
 * Card — surface container with optional header / footer slots
 *
 * <Card>
 *   <Card.Header title="Title" action={<Button>...</Button>} />
 *   <Card.Body>content</Card.Body>
 *   <Card.Footer>footer</Card.Footer>
 * </Card>
 *
 * Or shorthand props:
 * <Card title="Title" action={...} padding={false}>children</Card>
 */

const cardStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

/* ── Card.Header ── */
const Header = ({ title, subtitle, action, style: extra = {}, children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid var(--color-border)',
      gap: 12,
      ...extra,
    }}
  >
    {title || subtitle ? (
      <div style={{ minWidth: 0 }}>
        {title && (
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
        )}
        {subtitle && (
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    ) : (
      children
    )}
    {action && <div style={{ flexShrink: 0 }}>{action}</div>}
  </div>
);

/* ── Card.Body ── */
const Body = ({ children, padding = true, style: extra = {} }) => (
  <div
    style={{
      flex: 1,
      padding: padding ? '20px' : 0,
      fontFamily: 'var(--font-sans)',
      ...extra,
    }}
  >
    {children}
  </div>
);

/* ── Card.Footer ── */
const Footer = ({ children, style: extra = {} }) => (
  <div
    style={{
      padding: '12px 20px',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-sans)',
      ...extra,
    }}
  >
    {children}
  </div>
);

/* ── Card (root) ── */
const Card = ({
  children,
  title,
  subtitle,
  action,
  padding = true,
  style: extra = {},
  className = '',
  ...rest
}) => {
  const hasShorthandHeader = title || subtitle || action;

  return (
    <div className={className} style={{ ...cardStyle, ...extra }} {...rest}>
      {hasShorthandHeader && <Header title={title} subtitle={subtitle} action={action} />}
      {hasShorthandHeader ? <Body padding={padding}>{children}</Body> : children}
    </div>
  );
};

Card.Header = Header;
Card.Body = Body;
Card.Footer = Footer;

export default Card;
