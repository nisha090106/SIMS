import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Inventory2Outlined as ProductIcon,
  WarehouseOutlined as StockIcon,
  StorefrontOutlined as WHIcon,
  DownloadOutlined as DownloadIcon,
} from '@mui/icons-material';
import { importAPI, warehouseAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import UploadZone from './UploadZone';
import ImportProgress from './ImportProgress';
import ImportHistory from './ImportHistory';

/* ── Import card config ──────────────────────────────────────── */
const CARDS = [
  {
    id: 'products',
    icon: ProductIcon,
    title: 'Products',
    description:
      'Import or update products in bulk. Creates new products and updates existing ones by SKU.',
    templateType: 'products',
    endpoint: 'uploadProducts',
    roles: ['admin', 'manager'],
    columns: [
      'Name',
      'SKU',
      'Barcode',
      'Category',
      'Unit',
      'ReorderLevel',
      'CostPrice',
      'SellingPrice',
      'Description',
    ],
  },
  {
    id: 'inventory',
    icon: StockIcon,
    title: 'Inventory / Stock',
    description:
      'Set stock levels for existing products. Managers are auto-assigned to their warehouse.',
    templateType: 'inventory',
    endpoint: 'uploadInventory',
    roles: ['admin', 'manager', 'staff'],
    columns: ['SKU', 'WarehouseCode*', 'Quantity', 'BatchNumber', 'ExpiryDate', 'StorageLocation'],
    note: '* WarehouseCode ignored for managers (auto-assigned)',
  },
  {
    id: 'warehouses',
    icon: WHIcon,
    title: 'Warehouses',
    description: 'Create or update warehouse records including manager assignment.',
    templateType: 'warehouses',
    endpoint: 'uploadWarehouses',
    roles: ['admin'],
    columns: ['Name', 'Code', 'Address', 'City', 'Country', 'ManagerEmail', 'Capacity'],
  },
];

/* ══════════════════════════════════════════════════════════════
   BulkImportCenter
══════════════════════════════════════════════════════════════ */
export default function BulkImportCenter() {
  const { showToast } = useToast();
  const { user } = useSelector((s) => s.auth);
  const role = user?.role;

  // Warehouses for the inventory import selector (admin needs to pick one)
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setWHId] = useState('');

  // Per-card state: { file, jobId, uploading, done }
  const [cards, setCards] = useState(() =>
    Object.fromEntries(
      CARDS.map((c) => [c.id, { file: null, jobId: null, uploading: false, done: false }]),
    ),
  );

  // History refresh trigger
  const [historyTick, setHistoryTick] = useState(0);

  // Load warehouses for inventory import
  useEffect(() => {
    warehouseAPI
      .getAll()
      .then((r) => {
        const whs = r.data.data || [];
        setWarehouses(whs);
        if (whs.length > 0) setWHId(whs[0].warehouse_id);
      })
      .catch(() => {});
  }, []);

  /* ── Per-card helpers ── */
  const setCardFile = (id, file) =>
    setCards((prev) => ({ ...prev, [id]: { ...prev[id], file, jobId: null, done: false } }));

  const clearCard = (id) =>
    setCards((prev) => ({
      ...prev,
      [id]: { file: null, jobId: null, uploading: false, done: false },
    }));

  /* ── Upload handler ── */
  const handleUpload = async (cardCfg) => {
    const { id, endpoint } = cardCfg;
    const { file } = cards[id];
    if (!file) {
      showToast('Select a file first.', 'error');
      return;
    }

    // Inventory: admin must pick a warehouse
    if (id === 'inventory' && role === 'admin' && !selectedWarehouseId) {
      showToast('Select a target warehouse for the inventory import.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (id === 'inventory' && selectedWarehouseId) {
      formData.append('warehouse_id', selectedWarehouseId);
    }

    setCards((prev) => ({
      ...prev,
      [id]: { ...prev[id], uploading: true, jobId: null, done: false },
    }));

    try {
      const res = await importAPI[endpoint](formData);
      if (res.data?.success) {
        showToast(`${cardCfg.title} import started (${res.data.total} rows).`, 'success');
        setCards((prev) => ({
          ...prev,
          [id]: { ...prev[id], uploading: false, jobId: res.data.jobId },
        }));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed.', 'error');
      setCards((prev) => ({ ...prev, [id]: { ...prev[id], uploading: false } }));
    }
  };

  /* ── Job completion callback ── */
  const handleComplete = useCallback(
    (id, job) => {
      setCards((prev) => ({ ...prev, [id]: { ...prev[id], done: true } }));
      setHistoryTick((t) => t + 1);
      const msg =
        job.status === 'failed'
          ? `Import failed — ${job.failed_rows} row(s) with errors.`
          : job.failed_rows > 0
            ? `Import completed with ${job.failed_rows} failed row(s).`
            : `Import completed — ${job.processed_rows} row(s) processed.`;
      showToast(
        msg,
        job.status === 'failed' ? 'error' : job.failed_rows > 0 ? 'warning' : 'success',
      );
    },
    [showToast],
  );

  /* ── Template download ── */
  const downloadTemplate = async (type, filename) => {
    try {
      const res = await importAPI.downloadTemplate(type);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to download template.', 'error');
    }
  };

  /* ── Visible cards filtered by role ── */
  const visibleCards = CARDS.filter((c) => c.roles.includes(role));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Page header ── */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Bulk Import Center
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Import Products, Inventory, or Warehouses from CSV / Excel files
        </p>
      </div>

      {/* ── Import cards row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${visibleCards.length}, minmax(0,1fr))`,
          gap: 16,
        }}
      >
        {visibleCards.map((cfg) => {
          const cardState = cards[cfg.id];
          const Icon = cfg.icon;

          return (
            <Card key={cfg.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card.Body style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-primary-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ fontSize: 24, color: 'var(--color-primary)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {cfg.title}
                    </h3>
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-sans)',
                        lineHeight: 1.4,
                      }}
                    >
                      {cfg.description}
                    </p>
                  </div>
                </div>

                {/* Expected columns */}
                <div
                  style={{
                    background: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 6px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Required columns
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {cfg.columns.map((col) => (
                      <span
                        key={col}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-xs)',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 4,
                          padding: '2px 6px',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                  {cfg.note && (
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-sans)',
                        fontStyle: 'italic',
                      }}
                    >
                      {cfg.note}
                    </p>
                  )}
                </div>

                {/* Warehouse selector for inventory import (Admin only) */}
                {cfg.id === 'inventory' && role === 'admin' && (
                  <Select
                    label='Target Warehouse'
                    required
                    value={selectedWarehouseId}
                    onChange={(e) => setWHId(e.target.value)}
                  >
                    <option value=''>Select warehouse…</option>
                    {warehouses.map((w) => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                )}
                {cfg.id === 'inventory' && role !== 'admin' && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'var(--color-primary-soft)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Stock will be imported into your assigned warehouse automatically.
                  </div>
                )}

                {/* Upload zone */}
                <UploadZone
                  file={cardState.file}
                  onFileSelect={(f) => setCardFile(cfg.id, f)}
                  onClear={() => clearCard(cfg.id)}
                  disabled={cardState.uploading || (!!cardState.jobId && !cardState.done)}
                />

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant='ghost'
                    size='sm'
                    leftIcon={<DownloadIcon style={{ fontSize: 15 }} />}
                    onClick={() =>
                      downloadTemplate(cfg.templateType, `${cfg.templateType}_template.csv`)
                    }
                  >
                    Template
                  </Button>
                  <Button
                    variant='primary'
                    size='sm'
                    fullWidth
                    loading={cardState.uploading}
                    disabled={!cardState.file || (!!cardState.jobId && !cardState.done)}
                    onClick={() => handleUpload(cfg)}
                  >
                    {cardState.uploading ? 'Uploading…' : 'Upload & Process'}
                  </Button>
                </div>

                {/* Import progress (while job is running or just finished) */}
                {cardState.jobId && (
                  <ImportProgress
                    jobId={cardState.jobId}
                    onComplete={(job) => handleComplete(cfg.id, job)}
                  />
                )}
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* ── Import History ── */}
      <ImportHistory refreshTrigger={historyTick} />
    </div>
  );
}
