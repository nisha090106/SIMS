import React from 'react';

const ACCENT = {
  blue: { bar: '#3b82f6', icon: 'rgba(59,130,246,0.12)', color: '#000000' },
  green: { bar: '#10b981', icon: 'rgba(16,185,129,0.12)', color: '#000000' },
  orange: { bar: '#f59e0b', icon: 'rgba(245,158,11,0.12)', color: '#000000' },
  purple: { bar: '#8b5cf6', icon: 'rgba(139,92,246,0.12)', color: '#000000' },
  rose: { bar: '#f43f5e', icon: 'rgba(244,63,94,0.12)', color: '#000000' },
  cyan: { bar: '#06b6d4', icon: 'rgba(6,182,212,0.12)', color: '#000000' },
};

/**
 * KpiCard — reusable KPI tile for all report tabs
 * Props: icon, label, value, sub, color (blue|green|orange|purple|rose|cyan), loading
 */
export default function KpiCard({ icon, label, value, sub, color = 'blue', loading = false }) {
  const accent = ACCENT[color] || ACCENT.blue;

  return (
    <div className='reports-kpi-card' style={{ position: 'relative' }}>
      {/* colored left bar */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          background: accent.bar,
          borderRadius: '4px 0 0 4px',
        }}
      />

      <div style={{ paddingLeft: 8 }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: accent.icon,
            color: accent.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          {icon}
        </div>

        <p className='kpi-label'>{label}</p>

        {loading ? (
          <div
            style={{
              height: 28,
              width: '60%',
              borderRadius: 6,
              background: '#f1f5f9',
              marginTop: 4,
            }}
          />
        ) : (
          <p className='kpi-value'>{value}</p>
        )}

        {sub && !loading && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              fontWeight: 500,
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
