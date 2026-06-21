import React from 'react';
import {
  CurrencyRupee as ValueIcon,
  WarningAmber as LowIcon,
  ErrorOutline as OutIcon,
  Inventory2Outlined as TotalIcon,
} from '@mui/icons-material';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

function KpiTile({ icon, label, value, variant = 'neutral', sub }) {
  const colorMap = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    primary: 'var(--color-primary)',
    neutral: 'var(--color-text-secondary)',
  };
  const softMap = {
    success: 'var(--color-success-soft)',
    warning: 'var(--color-warning-soft)',
    danger: 'var(--color-danger-soft)',
    primary: 'var(--color-primary-soft)',
    neutral: 'var(--color-surface-alt)',
  };
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 160 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          background: softMap[variant],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {React.cloneElement(icon, { style: { fontSize: 22, color: colorMap[variant] } })}
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: '3px 0 0',
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ValuationSummary({ valuation, isAdmin }) {
  if (!valuation) {
    return (
      <Card>
        <Card.Body>
          <div
            style={{
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              justifyContent: 'center',
              height: 80,
            }}
          >
            <Spinner size='md' />
            <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
              Loading valuation…
            </span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  const tiles = [
    {
      icon: <ValueIcon />,
      label: 'Total Stock Value',
      value: fmt(valuation.totalValue),
      variant: 'success',
    },
    {
      icon: <TotalIcon />,
      label: 'Unique Products',
      value: fmtNum(valuation.totalUniqueProducts),
      variant: 'primary',
    },
    {
      icon: <LowIcon />,
      label: 'Low Stock Items',
      value: fmtNum(valuation.lowStockCount),
      variant: valuation.lowStockCount > 0 ? 'warning' : 'neutral',
      sub: valuation.lowStockCount > 0 ? 'Need reorder' : 'All healthy',
    },
    {
      icon: <OutIcon />,
      label: 'Out of Stock',
      value: fmtNum(valuation.outOfStockCount),
      variant: valuation.outOfStockCount > 0 ? 'danger' : 'neutral',
      sub: valuation.outOfStockCount > 0 ? 'Immediate action needed' : '',
    },
  ];

  const whCols = [
    { key: 'name', label: 'Warehouse' },
    { key: 'city', label: 'City', width: 110 },
    { key: 'prods', label: 'Products', align: 'right', width: 100 },
    { key: 'qty', label: 'Total Qty', align: 'right', width: 110 },
    { key: 'value', label: 'Stock Value', align: 'right', width: 130 },
  ];

  const td = {
    padding: '9px 14px',
    borderBottom: '1px solid var(--color-border)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* KPI tiles */}
      <Card>
        <Card.Body>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 24,
              alignItems: 'center',
            }}
          >
            {tiles.map((t, i) => (
              <KpiTile key={i} {...t} />
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Per-warehouse breakdown (Admin only) */}
      {isAdmin && valuation.warehouseBreakdown?.length > 0 && (
        <Card title='Warehouse Stock Breakdown' padding={false}>
          <Table
            columns={whCols}
            data={valuation.warehouseBreakdown}
            loading={false}
            emptyText='No warehouses.'
            renderRow={(row, i) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 600 }}>{row.warehouseName}</td>
                <td style={{ ...td, color: 'var(--color-text-secondary)' }}>{row.city || '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtNum(row.uniqueProducts)}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {fmtNum(row.totalQty)}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}
                >
                  {fmt(row.stockValue)}
                </td>
              </tr>
            )}
          />
        </Card>
      )}
    </div>
  );
}
