import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  QrCode as BarcodeIcon,
  PlayArrow as RunIcon,
  Autorenew as AutoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';
import { barcodeAPI, warehouseAPI, automationAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/AutomationDashboard.css';

// ─── Section 1: Browser Barcode Scanner ──────────────────────────────────────

function BarcodeScannerWidget({ warehouses, userRole, userId }) {
  const [barcodeInput,    setBarcodeInput]    = useState('');
  const [scannerWHId,     setScannerWHId]     = useState('');
  const [scanQty,         setScanQty]         = useState(1);
  const [scanType,        setScanType]        = useState('stock_in');
  const [scanNotes,       setScanNotes]       = useState('');
  const [scanning,        setScanning]        = useState(false);
  const [scanResult,      setScanResult]      = useState(null);   // null | { found, product?, before_qty, after_qty, barcode }
  const [recentScans,     setRecentScans]     = useState([]);

  const barcodeRef = useRef(null);

  // Pre-select first warehouse on load
  useEffect(() => {
    if (warehouses.length > 0 && !scannerWHId) {
      setScannerWHId(String(warehouses[0].warehouse_id));
    }
  }, [warehouses]);

  // Manager/staff: warehouse is fixed to their own — no choice
  const warehouseFixed = userRole !== 'admin' && warehouses.length === 1;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const bc = barcodeInput.trim();
    if (!bc)           return;
    if (!scannerWHId)  return;

    setScanning(true);
    setScanResult(null);

    try {
      const payload = {
        barcode:      bc,
        warehouse_id: parseInt(scannerWHId, 10),
        scan_type:    scanType,
        quantity:     Math.max(1, parseInt(scanQty, 10) || 1),
        notes:        scanNotes || undefined,
      };
      const res  = await barcodeAPI.scan(payload);
      const data = res.data;

      setScanResult(data);

      // Session history (last 10)
      setRecentScans((prev) => [{
        id:          Date.now(),
        timestamp:   new Date(),
        barcode:     bc,
        found:       data.found,
        productName: data.found ? data.product.name : 'Unrecognised',
        sku:         data.found ? data.product.sku  : 'N/A',
        scanType,
        quantity:    payload.quantity,
        beforeQty:   data.before_qty,
        afterQty:    data.after_qty,
        success:     true,
      }, ...prev.slice(0, 9)]);

      // Clear input, keep warehouse / type for rapid scanning
      setBarcodeInput('');
      setScanQty(1);
      setScanNotes('');
      setTimeout(() => barcodeRef.current?.focus(), 80);
    } catch (err) {
      const msg = err.response?.data?.error || 'Scan failed';
      setScanResult({ error: true, message: msg });
    } finally {
      setScanning(false);
    }
  }, [barcodeInput, scannerWHId, scanType, scanQty, scanNotes]);

  // Allow pressing Enter in the barcode field to submit
  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      handleSubmit(e);
    }
  };

  return (
    <section className="auto-section-block">
      <h2 className="section-title">Browser Barcode Scanner</h2>

      <div className="barcode-widget-box">
        <form onSubmit={handleSubmit} className="scan-widget-form">

          {/* Barcode input */}
          <div className="widget-form-group">
            <label htmlFor="bc-input">Enter or Scan Barcode</label>
            <div className="input-with-icon">
              <BarcodeIcon className="input-icon" />
              <input
                id="bc-input"
                ref={barcodeRef}
                type="text"
                placeholder="Scan barcode or type SKU…"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>

          {/* Warehouse + Quantity row */}
          <div className="widget-form-row">
            <div className="widget-form-group">
              <label htmlFor="bc-warehouse">Select Warehouse</label>
              {warehouseFixed ? (
                /* Manager/staff: read-only pill showing their warehouse */
                <div style={{
                  padding: '0.55rem 0.75rem',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b',
                }}>
                  {warehouses[0]?.name || '—'}
                </div>
              ) : (
                <select
                  id="bc-warehouse"
                  value={scannerWHId}
                  onChange={(e) => setScannerWHId(e.target.value)}
                  required
                >
                  <option value="">Select…</option>
                  {warehouses.map((w) => (
                    <option key={w.warehouse_id} value={w.warehouse_id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="widget-form-group">
              <label htmlFor="bc-qty">Quantity</label>
              <input
                id="bc-qty"
                type="number"
                min="1"
                value={scanQty}
                onChange={(e) => setScanQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ textAlign: 'center', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Stock In / Stock Out toggle */}
          <div className="widget-form-group">
            <label>Scan Transaction Type</label>
            <div className="scan-type-toggle-switch">
              <button
                type="button"
                className={`toggle-btn stock_in ${scanType === 'stock_in' ? 'active' : ''}`}
                onClick={() => setScanType('stock_in')}
              >
                Stock In
              </button>
              <button
                type="button"
                className={`toggle-btn stock_out ${scanType === 'stock_out' ? 'active' : ''}`}
                onClick={() => setScanType('stock_out')}
              >
                Stock Out
              </button>
            </div>
          </div>

          {/* Audit notes */}
          <div className="widget-form-group">
            <label htmlFor="bc-notes">Scan Audit Notes (Optional)</label>
            <textarea
              id="bc-notes"
              rows={2}
              placeholder="Reason for adjustment, shelf code, etc."
              value={scanNotes}
              onChange={(e) => setScanNotes(e.target.value)}
              style={{
                padding: '0.55rem 0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="scan-widget-submit-btn"
            disabled={scanning || !barcodeInput.trim() || !scannerWHId}
          >
            {scanning ? 'Processing…' : 'Submit Barcode Scan'}
          </button>
        </form>

        {/* Scan result feedback */}
        {scanResult && (
          <div className={`scan-result-card ${scanResult.error ? 'not-found' : scanResult.found ? 'found' : 'not-found'}`}>
            <div className="card-header">
              {scanResult.error ? (
                <><WarnIcon style={{ fontSize: 18 }} /> Scan Error</>
              ) : scanResult.found ? (
                <><SuccessIcon style={{ fontSize: 18 }} /> Item Processed</>
              ) : (
                <><WarnIcon style={{ fontSize: 18 }} /> Unrecognised Barcode</>
              )}
            </div>
            <div className="result-details">
              {scanResult.error ? (
                <p>{scanResult.message}</p>
              ) : scanResult.found ? (
                <>
                  <p>Product: <strong>{scanResult.product?.name}</strong></p>
                  <p>SKU: <code>{scanResult.product?.sku}</code></p>
                  <p>Stock: <code>{scanResult.before_qty}</code> → <strong><code>{scanResult.after_qty}</code></strong></p>
                </>
              ) : (
                <>
                  <p>Barcode <code>{scanResult.barcode}</code> was not recognised.</p>
                  <span className="notice">The scan has been saved to unrecognised logs.</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Session scan history */}
        {recentScans.length > 0 && (
          <div className="recent-scans-widget-box">
            <h4>Recent Scans — This Session</h4>
            <div className="table-responsive">
              <table className="recent-scans-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((s) => (
                    <tr key={s.id} className={s.success ? 'scan-row-ok' : 'scan-row-fail'}>
                      <td><code>{s.sku}</code></td>
                      <td>{s.productName}</td>
                      <td>
                        <span className={`badge-type ${s.scanType}`}>
                          {s.scanType === 'stock_in' ? 'Stock In' : 'Stock Out'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {s.scanType === 'stock_in' ? '+' : '−'}{s.quantity}
                      </td>
                      <td className="scan-time">
                        {s.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Section 2: Auto-generate product barcodes ───────────────────────────────

function BarcodeGenerationCard({ hasAccess }) {
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!hasAccess) { showToast('Access denied.', 'error'); return; }
    setGenerating(true);
    try {
      const res = await automationAPI.generateBarcodes();
      if (res.data?.success) {
        const updated = res.data.updated ?? res.data.data?.updated ?? 0;
        showToast(`Updated ${updated} product(s) with new barcodes.`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate barcodes.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="auto-section-block">
      <h2 className="section-title">Product Barcode Management</h2>
      <div className="barcode-gen-card">
        <div className="card-header-section">
          <div className="card-icon-box">
            <BarcodeIcon className="card-icon" />
          </div>
          <div className="card-text-section">
            <h3>Auto-generate product barcodes</h3>
            <p>
              Generate barcodes for products without barcode values.
              Format: SIMS + product ID (padded to 8 digits)
            </p>
          </div>
        </div>
        <div className="card-actions-section">
          <button
            className="barcode-gen-btn"
            onClick={handleGenerate}
            disabled={generating || !hasAccess}
            title={!hasAccess ? 'Access denied' : 'Generate barcodes for all products without one'}
          >
            {generating ? (
              <><AutoIcon className="btn-icon spinning" /> Generating…</>
            ) : (
              <><RunIcon className="btn-icon" /> Run Now</>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function BarcodePage() {
  const { user } = useSelector((s) => s.auth);
  const userRole = user?.role || 'staff';
  const userId   = user?.id   || user?.user_id;
  const hasAccess = ['admin', 'manager', 'staff'].includes(userRole);

  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    warehouseAPI.getAll({ limit: 200 })
      .then((res) => {
        const all = res.data.data || [];
        if (userRole === 'admin') {
          setWarehouses(all);
        } else {
          // Manager/staff: only show warehouses they manage
          const managed = all.filter((w) => w.manager_id === userId);
          setWarehouses(managed.length > 0 ? managed : all.slice(0, 1));
        }
      })
      .catch(() => {});
  }, [userRole, userId]);

  return (
    <div className="automation-dashboard-page">
      {/* Page header */}
      <header className="auto-page-header">
        <div className="header-info">
          <h1>Barcode Center</h1>
          <p>Scan barcodes into stock and auto-generate labels for unlabelled products</p>
        </div>
      </header>

      {/* Section 1 — Scanner */}
      <BarcodeScannerWidget
        warehouses={warehouses}
        userRole={userRole}
        userId={userId}
      />

      {/* Section 2 — Auto-generate barcodes */}
      <BarcodeGenerationCard hasAccess={hasAccess} />
    </div>
  );
}
