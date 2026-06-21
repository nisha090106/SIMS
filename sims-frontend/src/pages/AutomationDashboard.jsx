import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Autorenew as AutoIcon,
  PlayArrow as RunIcon,
  Warning as WarningIcon,
  QrCode as BarcodeIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as SuccessIcon,
  Error as FailedIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  History as LogsIcon,
} from '@mui/icons-material';
import { automationAPI, barcodeAPI, warehouseAPI, productAPI, supplierAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/AutomationDashboard.css';

// Default form state for reorder rule modal
const defaultRuleForm = {
  product_id: '',
  warehouse_id: '',
  reorder_threshold: '',
  reorder_quantity: '',
  preferred_supplier_id: '',
  is_active: true,
};

const AutomationDashboard = () => {
  const { showToast } = useToast();
  const { user } = useSelector((state) => state.auth);
  const role = user?.role;
  const isAdmin = role === 'admin';

  // 1. Cron Status State
  const [cronJobs, setCronJobs] = useState({
    low_stock_checker: {
      label: 'Low Stock Checker',
      cron: 'Every 30 min',
      lastRun: null,
      status: null,
    },
    nightly_sync: {
      label: 'Nightly Sync',
      cron: 'Every night at 2 AM',
      lastRun: null,
      status: null,
    },
    cleanup_temp_files: {
      label: 'Temp File Cleanup',
      cron: 'Every night at 3 AM',
      lastRun: null,
      status: null,
    },
  });
  const [triggeringJob, setTriggeringJob] = useState(null);

  // 2. Reorder Rules State
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ ...defaultRuleForm });
  const [ruleFormErrors, setRuleFormErrors] = useState({});
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // Droplist details
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // 3. Automation Logs State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Logs Filter States
  const [logFilterJob, setLogFilterJob] = useState('');
  const [logFilterDateFrom, setLogFilterDateFrom] = useState('');
  const [logFilterDateTo, setLogFilterDateTo] = useState('');

  // 4. Barcode Scan Center State
  const [unrecognisedCount, setUnrecognisedCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unrecognisedScans, setUnrecognisedScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [scanPage, setScanPage] = useState(1);
  const [scanTotalPages, setScanTotalPages] = useState(1);
  const [linkingScanId, setLinkingScanId] = useState(null);
  const [linkingProductId, setLinkingProductId] = useState('');

  // 5. Barcode Scanner Widget State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannerWarehouseId, setScannerWarehouseId] = useState('');
  const [scanType, setScanType] = useState('stock_in'); // 'stock_in' | 'stock_out'
  const [scanQty, setScanQty] = useState(1);
  const [scannerNotes, setScannerNotes] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const barcodeInputRef = useRef(null);

  // 6. Barcode Generation State
  const [generatingBarcodes, setGeneratingBarcodes] = useState(false);

  // Fetch Cron statuses from recent logs
  const fetchCronJobStatuses = useCallback(async () => {
    try {
      const res = await automationAPI.getLogs({ limit: 30 }); // Grab a batch of logs
      if (res.data && res.data.success) {
        const list = res.data.data || [];
        const updatedJobs = { ...cronJobs };

        // Find latest execution for each job type
        ['low_stock_checker', 'nightly_sync', 'cleanup_temp_files'].forEach((name) => {
          const latestLog = list.find((log) => log.job_name === name);
          if (latestLog) {
            updatedJobs[name].lastRun = latestLog.ran_at;
            updatedJobs[name].status = latestLog.status;
          }
        });
        setCronJobs(updatedJobs);
      }
    } catch (err) {
      console.error('Failed to fetch cron logs:', err);
    }
  }, [cronJobs]);

  // Fetch Reorder Rules list
  const fetchReorderRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const res = await automationAPI.getReorderRules();
      if (res.data && res.data.success) {
        setRules(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve reorder rules.', 'error');
    } finally {
      setLoadingRules(false);
    }
  }, [showToast]);

  // Fetch Automation logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = {
        page: logsPage,
        limit: 10,
        job_name: logFilterJob || undefined,
        date_from: logFilterDateFrom || undefined,
        date_to: logFilterDateTo || undefined,
      };
      const res = await automationAPI.getLogs(params);
      if (res.data && res.data.success) {
        setLogs(res.data.data || []);
        setLogsTotalPages(res.data.totalPages || 1);
        setLogsTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }, [logsPage, logFilterJob, logFilterDateFrom, logFilterDateTo]);

  // Fetch Unrecognised Scans Count
  const fetchUnrecognisedCount = useCallback(async () => {
    try {
      const res = await barcodeAPI.getUnrecognised({ limit: 1 });
      if (res.data && res.data.success) {
        setUnrecognisedCount(res.data.data?.total || 0);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch Unrecognised Scans list for drawer
  const fetchUnrecognisedScans = useCallback(async () => {
    setLoadingScans(true);
    try {
      const res = await barcodeAPI.getUnrecognised({ page: scanPage, limit: 10 });
      if (res.data && res.data.success) {
        setUnrecognisedScans(res.data.data?.logs || []);
        setScanTotalPages(res.data.data?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load unrecognised scans list.', 'error');
    } finally {
      setLoadingScans(false);
    }
  }, [scanPage, showToast]);

  // Initial data loading
  useEffect(() => {
    fetchCronJobStatuses();
    fetchReorderRules();
    fetchUnrecognisedCount();

    // Fetch resources lists
    const fetchResources = async () => {
      try {
        const [wRes, pRes, sRes] = await Promise.all([
          warehouseAPI.getAll(),
          productAPI.getAll({ limit: 1000 }),
          supplierAPI.getAll(),
        ]);
        if (wRes.data?.success) {
          const warehousesData = Array.isArray(wRes.data.data) ? wRes.data.data : wRes.data.data?.warehouses || [];
          setWarehouses(warehousesData);
          if (warehousesData?.length > 0) {
            setScannerWarehouseId(warehousesData[0].warehouse_id);
          }
        }
        if (pRes.data?.success) {
          const productsData = Array.isArray(pRes.data.data) ? pRes.data.data : pRes.data.data?.products || [];
          setProducts(productsData);
        }
        if (sRes.data?.success) {
          const suppliersData = Array.isArray(sRes.data.data) ? sRes.data.data : sRes.data.data?.suppliers || [];
          setSuppliers(suppliersData);
        }
      } catch (err) {
        console.error('Failed to fetch dropdown list resources:', err);
      }
    };
    fetchResources();
  }, []);

  // Fetch logs whenever page/filters change
  useEffect(() => {
    fetchLogs();
  }, [logsPage, logFilterJob, logFilterDateFrom, logFilterDateTo, fetchLogs]);

  // Fetch unrecognised scans when drawer opens or page changes
  useEffect(() => {
    if (drawerOpen) {
      fetchUnrecognisedScans();
    }
  }, [drawerOpen, scanPage, fetchUnrecognisedScans]);

  // Handle Manual Trigger
  const handleTriggerJob = async (name) => {
    if (!isAdmin) {
      showToast('Only administrators can manually trigger jobs.', 'error');
      return;
    }

    setTriggeringJob(name);
    try {
      const res = await automationAPI.triggerJob(name);
      if (res.data && res.data.success) {
        showToast(`Job "${cronJobs[name].label}" triggered successfully.`, 'success');
        fetchCronJobStatuses();
        fetchLogs();
        if (name === 'low_stock_checker') {
          fetchReorderRules(); // Might update trigger timestamp
        }
      }
    } catch (err) {
      console.error(err);
      showToast(
        err.response?.data?.error || `Failed to trigger job "${cronJobs[name].label}".`,
        'error',
      );
    } finally {
      setTriggeringJob(null);
    }
  };

  // Handle Barcode Generation
  const handleGenerateBarcodes = async () => {
    if (!isAdmin) {
      showToast('Only administrators can generate barcodes.', 'error');
      return;
    }

    setGeneratingBarcodes(true);
    try {
      const res = await automationAPI.generateBarcodes();
      if (res.data && res.data.success) {
        const updated = res.data.updated || 0;
        showToast(`Updated ${updated} products with barcodes`, 'success');
        fetchCronJobStatuses();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to generate barcodes.', 'error');
    } finally {
      setGeneratingBarcodes(false);
    }
  };

  // Toggle Rule Status
  const handleToggleRule = async (ruleId) => {
    try {
      const res = await automationAPI.toggleReorderRule(ruleId);
      if (res.data && res.data.success) {
        showToast('Reorder rule status updated.', 'success');
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, is_active: res.data.data.is_active } : r)),
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to toggle reorder rule.', 'error');
    }
  };

  // Add/Edit Rules handlers
  const openAddRuleModal = () => {
    setEditingRule(null);
    setRuleForm({ ...defaultRuleForm });
    setRuleFormErrors({});
    setRuleModalOpen(true);
  };

  const openEditRuleModal = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      product_id: rule.product_id != null ? String(rule.product_id) : '',
      warehouse_id: rule.warehouse_id != null ? String(rule.warehouse_id) : '',
      reorder_threshold: rule.reorder_threshold != null ? rule.reorder_threshold : '',
      reorder_quantity: rule.reorder_quantity != null ? rule.reorder_quantity : '',
      preferred_supplier_id: rule.preferred_supplier_id != null ? String(rule.preferred_supplier_id) : '',
      is_active: rule.is_active ?? true,
    });
    setRuleFormErrors({});
    setRuleModalOpen(true);
  };

  const handleRuleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRuleForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field error on change
    if (ruleFormErrors[name]) {
      setRuleFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateRuleForm = () => {
    const errors = {};
    if (!ruleForm.product_id) errors.product_id = 'Product is required';
    if (ruleForm.reorder_threshold === '' || ruleForm.reorder_threshold === null) {
      errors.reorder_threshold = 'Threshold quantity is required';
    } else if (isNaN(ruleForm.reorder_threshold) || Number(ruleForm.reorder_threshold) < 0) {
      errors.reorder_threshold = 'Threshold cannot be negative';
    }
    if (ruleForm.reorder_quantity === '' || ruleForm.reorder_quantity === null) {
      errors.reorder_quantity = 'Reorder quantity is required';
    } else if (isNaN(ruleForm.reorder_quantity) || Number(ruleForm.reorder_quantity) < 1) {
      errors.reorder_quantity = 'Reorder quantity must be at least 1';
    }
    return errors;
  };

  const handleRuleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateRuleForm();
    if (Object.keys(errors).length > 0) {
      setRuleFormErrors(errors);
      return;
    }

    setRuleSubmitting(true);
    try {
      const payload = {
        product_id: parseInt(ruleForm.product_id),
        warehouse_id: ruleForm.warehouse_id ? parseInt(ruleForm.warehouse_id) : null,
        reorder_threshold: parseInt(ruleForm.reorder_threshold),
        reorder_quantity: parseInt(ruleForm.reorder_quantity),
        preferred_supplier_id: ruleForm.preferred_supplier_id
          ? parseInt(ruleForm.preferred_supplier_id)
          : null,
        is_active: ruleForm.is_active,
      };

      let res;
      if (editingRule) {
        res = await automationAPI.updateReorderRule(editingRule.id, payload);
      } else {
        res = await automationAPI.createReorderRule(payload);
      }

      if (res.data && res.data.success) {
        showToast(`Reorder rule ${editingRule ? 'updated' : 'created'} successfully.`, 'success');
        setRuleModalOpen(false);
        setRuleForm({ ...defaultRuleForm });
        fetchReorderRules();
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to save reorder rule.', 'error');
    } finally {
      setRuleSubmitting(false);
    }
  };

  // Link scan to product handler
  const handleLinkScan = async () => {
    if (!linkingScanId || !linkingProductId) {
      showToast('Please select a product to link.', 'error');
      return;
    }

    try {
      const res = await barcodeAPI.linkScan(linkingScanId, parseInt(linkingProductId));
      if (res.data && res.data.success) {
        showToast('Barcode linked and inventory levels processed successfully!', 'success');
        setLinkingScanId(null);
        setLinkingProductId('');
        fetchUnrecognisedScans();
        fetchUnrecognisedCount();
        // Clear scanResult in case it matched this unrecognised barcode
        setScanResult(null);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to link barcode to product.', 'error');
    }
  };

  // Barcode Scanning Form Submission
  const handleBarcodeScanSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) {
      showToast('Please enter or scan a barcode.', 'error');
      return;
    }
    if (!scannerWarehouseId) {
      showToast('Please select a target warehouse.', 'error');
      return;
    }

    setScanning(true);
    setScanResult(null);
    try {
      const payload = {
        barcode: barcodeInput.trim(),
        warehouse_id: parseInt(scannerWarehouseId),
        scan_type: scanType,
        quantity: parseInt(scanQty),
        notes: scannerNotes || undefined,
      };

      const res = await barcodeAPI.scan(payload);
      if (res.data && res.data.success) {
        const data = res.data;
        setScanResult(data);

        // Log to recent scans local state list (keep last 10)
        const logItem = {
          id: Date.now(),
          timestamp: new Date(),
          barcode: payload.barcode,
          found: data.found,
          productName: data.found ? data.product.name : 'Unrecognised Item (Logged)',
          sku: data.found ? data.product.sku : 'N/A',
          scanType: scanType,
          quantity: scanQty,
          beforeQty: data.before_qty,
          afterQty: data.after_qty,
          success: true,
        };
        setRecentScans((prev) => [logItem, ...prev.slice(0, 9)]);

        // Notify counts or log tables
        fetchUnrecognisedCount();
        fetchLogs();

        // Clear scanning code input
        setBarcodeInput('');
        setScannerNotes('');
        setScanQty(1);

        // Show detailed success toast
        if (data.found) {
          const qtyDelta = scanType === 'stock_in' ? `+${scanQty}` : `-${scanQty}`;
          showToast(
            `${data.product.name} — ${qtyDelta} updated. New stock: ${data.after_qty}`,
            'success',
          );
        } else {
          showToast('Unrecognised barcode scan logged.', 'success');
        }

        // Auto-focus back to barcode input for next scan
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to process scan.';
      showToast(errMsg, 'error');

      // Log failed scan locally
      const logItem = {
        id: Date.now(),
        timestamp: new Date(),
        barcode: barcodeInput.trim(),
        found: false,
        productName: 'Scan Process Failed',
        sku: 'ERROR',
        scanType: scanType,
        quantity: scanQty,
        success: false,
        message: errMsg,
      };
      setRecentScans((prev) => [logItem, ...prev.slice(0, 9)]);

      // Still re-focus for next attempt
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } finally {
      setScanning(false);
    }
  };

  // Helper formatting dates/time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className='automation-dashboard-page'>
      {/* Page Header */}
      <header className='auto-page-header'>
        <div className='header-info'>
          <h1>Automation Center</h1>
          <p>
            Control background cron jobs, configure reorder rules, resolve barcode conflicts, and
            scan in-browser
          </p>
        </div>
      </header>

      {/* Barcode Unrecognised Scans Warning Card */}
      {unrecognisedCount > 0 && (
        <div className='barcode-warning-card'>
          <div className='warning-card-graphic'>
            <WarningIcon className='warning-graphic-icon' />
          </div>
          <div className='warning-card-content'>
            <h3>Unrecognised Barcode Conflicts Detected</h3>
            <p>
              <strong>{unrecognisedCount}</strong> scan record(s) could not be mapped to any
              existing product catalog SKU.
            </p>
          </div>
          <button
            className='resolve-warning-btn'
            onClick={() => {
              setScanPage(1);
              setDrawerOpen(true);
            }}
          >
            Open Conflict Resolution
          </button>
        </div>
      )}

      {/* Section 1: Cron Jobs Cards */}
      <section className='auto-section-block'>
        <h2 className='section-title'>Background Scheduled Jobs</h2>
        <div className='cron-jobs-grid'>
          {Object.entries(cronJobs).map(([key, job]) => {
            const isRunning = triggeringJob === key;
            return (
              <div key={key} className={`cron-card ${job.status}`}>
                <div className='cron-header-row'>
                  <div className='cron-title-box'>
                    <h3>{job.label}</h3>
                    <span className='cron-schedule-info'>Schedule: {job.cron}</span>
                  </div>
                  <span className={`cron-status-badge ${job.status}`}>
                    {job.status || 'No Log'}
                  </span>
                </div>

                <div className='cron-meta-stats'>
                  <span className='lbl'>Last Run Timestamp:</span>
                  <strong className='val'>{formatDateTime(job.lastRun)}</strong>
                </div>

                <div className='cron-actions-bar'>
                  <button
                    className='cron-run-now-btn'
                    onClick={() => handleTriggerJob(key)}
                    disabled={isRunning || !isAdmin}
                    title={!isAdmin ? 'Admin privilege required' : 'Trigger task manually now'}
                  >
                    {isRunning ? 'Executing Job...' : 'Run Now'}
                    {!isRunning && <RunIcon className='btn-icon' />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section: Auto-Generate Barcodes Card */}
      <section className='auto-section-block'>
        <h2 className='section-title'>Product Barcode Management</h2>
        <div className='barcode-gen-card'>
          <div className='card-header-section'>
            <div className='card-icon-box'>
              <BarcodeIcon className='card-icon' />
            </div>
            <div className='card-text-section'>
              <h3>Auto-generate product barcodes</h3>
              <p>
                Generate barcodes for products without barcode values. Format: SIMS + product ID
                (padded to 8 digits)
              </p>
            </div>
          </div>
          <div className='card-actions-section'>
            <button
              className='barcode-gen-btn'
              onClick={handleGenerateBarcodes}
              disabled={generatingBarcodes || !isAdmin}
              title={
                !isAdmin
                  ? 'Admin privilege required'
                  : 'Generate barcodes for all products without barcodes'
              }
            >
              {generatingBarcodes ? (
                <>
                  <AutoIcon className='btn-icon spinning' />
                  Generating...
                </>
              ) : (
                <>
                  <RunIcon className='btn-icon' />
                  Run Now
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Two Columns Layout: Reorder Rules & Barcode Widget */}
      <div className='auto-two-col-layout'>
        {/* Left: Reorder Rules */}
        <section className='auto-section-block left-panel'>
          <div className='panel-header-toolbar'>
            <h2 className='section-title'>Automated Reorder Rules</h2>
            <button className='panel-add-btn' onClick={openAddRuleModal}>
              <AddIcon className='btn-icon' />
              Add Reorder Rule
            </button>
          </div>

          <div className='rules-table-container'>
            {loadingRules ? (
              <div className='panel-loading-box'>
                <div className='spinner'></div>
                <p>Loading rules list...</p>
              </div>
            ) : rules.length === 0 ? (
              <div className='panel-empty-box'>
                <p>No reorder rules defined yet.</p>
              </div>
            ) : (
              <div className='table-responsive'>
                <table className='rules-grid-table'>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className='align-center'>Threshold</th>
                      <th className='align-center'>Reorder Qty</th>
                      <th>Preferred Supplier</th>
                      <th>Warehouse</th>
                      <th className='align-center'>Status</th>
                      <th className='align-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(rules) && rules.map((rule) => (
                      <tr key={rule.id}>
                        <td>
                          <strong>{rule.product?.name || `Product ID: ${rule.product_id}`}</strong>
                        </td>
                        <td className='align-center font-semibold'>{rule.reorder_threshold}</td>
                        <td className='align-center font-semibold text-primary'>
                          {rule.reorder_quantity}
                        </td>
                        <td>{rule.preferredSupplier?.name || 'Any Supplier'}</td>
                        <td>{rule.warehouse?.name || 'All Warehouses'}</td>
                        <td className='align-center'>
                          <label className='toggle-switch-label'>
                            <input
                              type='checkbox'
                              checked={rule.is_active}
                              onChange={() => handleToggleRule(rule.id)}
                            />
                            <span className='slider round'></span>
                          </label>
                        </td>
                        <td className='align-right'>
                          <button
                            className='rule-action-btn edit'
                            onClick={() => openEditRuleModal(rule)}
                          >
                            <EditIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Right: Barcode Scanner Widget */}
        <section className='auto-section-block right-panel'>
          <h2 className='section-title'>Browser Barcode Scanner</h2>
          <div className='barcode-widget-box'>
            <form onSubmit={handleBarcodeScanSubmit} className='scan-widget-form'>
              <div className='widget-form-group'>
                <label htmlFor='scan-code-input'>Enter or Scan Barcode</label>
                <div className='input-with-icon'>
                  <BarcodeIcon className='input-icon' />
                  <input
                    id='scan-code-input'
                    ref={barcodeInputRef}
                    type='text'
                    placeholder='Scan barcode or type SKU...'
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && barcodeInput.trim()) {
                        e.preventDefault();
                        handleBarcodeScanSubmit(e);
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <div className='widget-form-row'>
                <div className='widget-form-group'>
                  <label htmlFor='scan-warehouse-dropdown'>Select Warehouse</label>
                  <select
                    id='scan-warehouse-dropdown'
                    value={scannerWarehouseId}
                    onChange={(e) => setScannerWarehouseId(e.target.value)}
                  >
                    {Array.isArray(warehouses) && warehouses.map((w) => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='widget-form-group'>
                  <label htmlFor='scan-qty-input'>Quantity</label>
                  <input
                    id='scan-qty-input'
                    type='number'
                    min='1'
                    value={scanQty}
                    onChange={(e) => setScanQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div className='widget-form-group'>
                <label>Scan Transaction Type</label>
                <div className='scan-type-toggle-switch'>
                  <button
                    type='button'
                    className={`toggle-btn stock_in ${scanType === 'stock_in' ? 'active' : ''}`}
                    onClick={() => setScanType('stock_in')}
                  >
                    Stock In
                  </button>
                  <button
                    type='button'
                    className={`toggle-btn stock_out ${scanType === 'stock_out' ? 'active' : ''}`}
                    onClick={() => setScanType('stock_out')}
                  >
                    Stock Out
                  </button>
                </div>
              </div>

              <div className='widget-form-group'>
                <label htmlFor='scan-notes-input'>Scans Audit Notes (Optional)</label>
                <input
                  id='scan-notes-input'
                  type='text'
                  placeholder='Reason for adjustment, shelf code...'
                  value={scannerNotes}
                  onChange={(e) => setScannerNotes(e.target.value)}
                />
              </div>

              <button type='submit' className='scan-widget-submit-btn' disabled={scanning}>
                {scanning ? 'Processing Scan...' : 'Submit Barcode Scan'}
              </button>
            </form>

            {/* Scan Real-time Result */}
            {scanResult && (
              <div className={`scan-result-card ${scanResult.found ? 'found' : 'not-found'}`}>
                <div className='card-header'>
                  {scanResult.found ? (
                    <>
                      <SuccessIcon className='text-success' />
                      <strong>Item Matched & Processed</strong>
                    </>
                  ) : (
                    <>
                      <WarningIcon className='text-warning' />
                      <strong>Unrecognised Item Logged</strong>
                    </>
                  )}
                </div>

                {scanResult.found ? (
                  <div className='result-details'>
                    <p className='prod-title'>
                      Product: <strong>{scanResult.product?.name}</strong>
                    </p>
                    <p className='prod-sku'>
                      SKU: <code>{scanResult.product?.sku}</code>
                    </p>
                    <div className='qty-shift'>
                      Stock Level: <code>{scanResult.before_qty}</code> →{' '}
                      <code className='txt-bold'>{scanResult.after_qty}</code>
                    </div>
                  </div>
                ) : (
                  <div className='result-details'>
                    <p>
                      Barcode <code>{scanResult.barcode}</code> could not be matched.
                    </p>
                    <span className='notice'>
                      This scan has been saved to unrecognised logs for manual resolution.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Recent Scans list */}
            <div className='recent-scans-widget-box'>
              <h4>Recent Widget Scans (Session Only)</h4>
              {recentScans.length === 0 ? (
                <p className='empty-txt'>No barcodes scanned yet in this window.</p>
              ) : (
                <div className='table-responsive'>
                  <table className='recent-scans-table'>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Action</th>
                        <th className='align-center'>Qty</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(recentScans) && recentScans.map((s) => (
                        <tr key={s.id} className={s.success ? 'scan-row-ok' : 'scan-row-fail'}>
                          <td>
                            <code>{s.sku}</code>
                          </td>
                          <td>{s.productName}</td>
                          <td>
                            <span className={`badge-type ${s.scanType}`}>
                              {s.scanType === 'stock_in' ? 'Stock In' : 'Stock Out'}
                            </span>
                          </td>
                          <td className='align-center font-semibold'>
                            {s.scanType === 'stock_in' ? '+' : '-'}
                            {s.quantity}
                          </td>
                          <td className='scan-time'>
                            {new Date(s.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Section: Logs Table */}
      <section className='auto-section-block'>
        <header className='logs-section-header'>
          <LogsIcon />
          <h2 className='section-title'>Execution Audit Logs</h2>
        </header>

        {/* Logs Filter bar */}
        <div className='logs-filters-toolbar'>
          <div className='filter-group'>
            <label htmlFor='log-job-select'>Job Name</label>
            <select
              id='log-job-select'
              value={logFilterJob}
              onChange={(e) => setLogFilterJob(e.target.value)}
            >
              <option value=''>All Jobs</option>
              <option value='low_stock_checker'>Low Stock Checker</option>
              <option value='nightly_sync'>Nightly Sync</option>
              <option value='cleanup_temp_files'>Temp File Cleanup</option>
            </select>
          </div>

          <div className='filter-group-date'>
            <CalendarIcon className='calendar-icon' />
            <input
              type='date'
              value={logFilterDateFrom}
              onChange={(e) => setLogFilterDateFrom(e.target.value)}
            />
            <span>to</span>
            <input
              type='date'
              value={logFilterDateTo}
              onChange={(e) => setLogFilterDateTo(e.target.value)}
            />
          </div>

          {(logFilterJob || logFilterDateFrom || logFilterDateTo) && (
            <button
              className='clear-logs-filters-btn'
              onClick={() => {
                setLogFilterJob('');
                setLogFilterDateFrom('');
                setLogFilterDateTo('');
              }}
            >
              Clear Filters
            </button>
          )}

          <div className='logs-total-count'>
            Total Logs: <strong>{logsTotalCount}</strong>
          </div>
        </div>

        {/* Logs Table */}
        <div className='logs-table-wrapper'>
          {loadingLogs ? (
            <div className='logs-loading-box'>
              <div className='spinner'></div>
              <p>Retrieving logs list...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className='logs-empty-box'>
              <p>No automation logs found matching filters.</p>
            </div>
          ) : (
            <div className='table-responsive'>
              <table className='logs-table'>
                <thead>
                  <tr>
                    <th>Job Name</th>
                    <th>Status</th>
                    <th className='align-center'>Records Affected</th>
                    <th className='align-center'>Duration</th>
                    <th>Ran At</th>
                    <th className='align-right'>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(logs) && logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const durationText = log.duration_ms !== null ? `${log.duration_ms} ms` : '-';
                    const recordsText = log.records_affected !== null ? log.records_affected : '-';

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className={`log-row-clickable ${isExpanded ? 'expanded' : ''}`}
                          onClick={() =>
                            setExpandedLogId((prev) => (prev === log.id ? null : log.id))
                          }
                        >
                          <td className='font-semibold text-capitalize'>
                            {log.job_name.replace(/_/g, ' ')}
                          </td>
                          <td>
                            <span className={`badge-log-status ${log.status}`}>{log.status}</span>
                          </td>
                          <td className='align-center'>{recordsText}</td>
                          <td className='align-center'>{durationText}</td>
                          <td>{formatDateTime(log.ran_at)}</td>
                          <td className='align-right'>
                            <button className='log-details-toggle'>
                              {isExpanded ? 'Hide' : 'Show Details'}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className='log-expanded-details-row'>
                            <td colSpan='6'>
                              <div className='log-expanded-box'>
                                <h4>Execution Summary Output</h4>
                                {(() => {
                                  try {
                                    const parsed = JSON.parse(log.summary);
                                    return (
                                      <pre className='summary-code-block'>
                                        <code>{JSON.stringify(parsed, null, 2)}</code>
                                      </pre>
                                    );
                                  } catch (e) {
                                    return (
                                      <pre className='summary-code-block'>
                                        <code>{log.summary}</code>
                                      </pre>
                                    );
                                  }
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Logs Table Pagination */}
        {logsTotalPages > 1 && (
          <div className='logs-table-pagination'>
            <button
              className='page-btn'
              onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
              disabled={logsPage === 1}
            >
              Previous
            </button>
            <span className='page-label'>
              Page <strong>{logsPage}</strong> of <strong>{logsTotalPages}</strong>
            </span>
            <button
              className='page-btn'
              onClick={() => setLogsPage((p) => Math.min(logsTotalPages, p + 1))}
              disabled={logsPage === logsTotalPages}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* Drawer: Conflict Barcode Scan resolution drawer */}
      <div className={`scan-resolution-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className='drawer-inner'>
          <header className='drawer-header'>
            <h3>Resolve Barcode Conflicts</h3>
            <button className='drawer-close-btn' onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </button>
          </header>

          <main className='drawer-body-scroller'>
            <p className='drawer-helper-desc'>
              These barcode scan inputs were not matched to any registered catalog SKU. Select an
              existing product to link the barcode.
            </p>

            {loadingScans ? (
              <div className='drawer-loading'>
                <div className='spinner'></div>
                <p>Loading conflict list...</p>
              </div>
            ) : unrecognisedScans.length === 0 ? (
              <div className='drawer-empty'>
                <p>All scanned barcodes resolved! No conflicts found.</p>
              </div>
            ) : (
              <div className='unrecognised-scans-list'>
                {Array.isArray(unrecognisedScans) && unrecognisedScans.map((scan) => (
                  <div key={scan.id} className='conflict-card-row'>
                    <div className='conflict-meta-box'>
                      <div className='barcode-badge'>
                        Barcode: <code>{scan.barcode}</code>
                      </div>
                      <div className='details'>
                        <span>
                          Warehouse: <strong>{scan.warehouse?.name || 'N/A'}</strong>
                        </span>
                        <span>
                          Scan Type:{' '}
                          <strong className='text-capitalize'>
                            {scan.scan_type.replace('_', ' ')}
                          </strong>
                        </span>
                        <span>
                          Qty: <strong>{scan.quantity}</strong>
                        </span>
                        <span>
                          Date: <strong>{formatDateTime(scan.created_at)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className='conflict-actions-bar'>
                      {linkingScanId === scan.id ? (
                        <div className='linking-form-row'>
                          <select
                            value={linkingProductId}
                            onChange={(e) => setLinkingProductId(e.target.value)}
                          >
                            <option value=''>-- Choose Catalog Product --</option>
                            {Array.isArray(products) && products.map((p) => (
                              <option key={p.product_id} value={p.product_id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                          <div className='link-actions'>
                            <button className='link-btn-submit' onClick={handleLinkScan}>
                              Confirm Link
                            </button>
                            <button
                              className='link-btn-cancel'
                              onClick={() => setLinkingScanId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className='link-product-init-btn'
                          onClick={() => {
                            setLinkingScanId(scan.id);
                            setLinkingProductId('');
                          }}
                        >
                          Link to Product
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {scanTotalPages > 1 && (
            <footer className='drawer-footer-pagination'>
              <button
                className='page-btn'
                onClick={() => setScanPage((p) => Math.max(1, p - 1))}
                disabled={scanPage === 1}
              >
                Prev
              </button>
              <span className='page-label'>
                Page {scanPage} of {scanTotalPages}
              </span>
              <button
                className='page-btn'
                onClick={() => setScanPage((p) => Math.min(scanTotalPages, p + 1))}
                disabled={scanPage === scanTotalPages}
              >
                Next
              </button>
            </footer>
          )}
        </div>
      </div>

      {/* Modal: Add/Edit Rule */}
      {ruleModalOpen && (
        <div className='mgmt-modal-overlay'>
          <div className='mgmt-modal-box animate-modal'>
            <header className='modal-header'>
              <h2>{editingRule ? 'Edit Reorder Rule' : 'Create Reorder Rule'}</h2>
              <button className='modal-close-btn' onClick={() => setRuleModalOpen(false)}>
                <CloseIcon />
              </button>
            </header>

            <form onSubmit={handleRuleFormSubmit}>
              <div className='modal-body'>
                {/* Product Selector */}
                <div className='modal-form-group'>
                  <label htmlFor='rule-product'>
                    Select Product <span className='req-asterisk'>*</span>
                  </label>
                  <select
                    name='product_id'
                    id='rule-product'
                    value={ruleForm.product_id}
                    onChange={handleRuleFormChange}
                    disabled={!!editingRule}
                  >
                    <option value=''>-- Choose Product --</option>
                    {Array.isArray(products) && products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        [{p.sku}] {p.name}
                      </option>
                    ))}
                  </select>
                  {ruleFormErrors.product_id && (
                    <div className='form-err-msg'>{ruleFormErrors.product_id}</div>
                  )}
                </div>

                {/* Warehouse Selector (Optional) */}
                <div className='modal-form-group'>
                  <label htmlFor='rule-warehouse'>Target Warehouse (Optional)</label>
                  <select
                    name='warehouse_id'
                    id='rule-warehouse'
                    value={ruleForm.warehouse_id}
                    onChange={handleRuleFormChange}
                  >
                    <option value=''>All Warehouses</option>
                    {Array.isArray(warehouses) && warehouses.map((w) => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Threshold and Reorder quantity */}
                <div className='modal-form-row'>
                  <div className='modal-form-group'>
                    <label htmlFor='rule-threshold'>
                      Threshold Qty <span className='req-asterisk'>*</span>
                    </label>
                    <input
                      type='number'
                      name='reorder_threshold'
                      id='rule-threshold'
                      min='0'
                      placeholder='e.g. 15'
                      value={ruleForm.reorder_threshold}
                      onChange={handleRuleFormChange}
                    />
                    {ruleFormErrors.reorder_threshold && (
                      <div className='form-err-msg'>{ruleFormErrors.reorder_threshold}</div>
                    )}
                  </div>

                  <div className='modal-form-group'>
                    <label htmlFor='rule-qty'>
                      Reorder Qty <span className='req-asterisk'>*</span>
                    </label>
                    <input
                      type='number'
                      name='reorder_quantity'
                      id='rule-qty'
                      min='1'
                      placeholder='e.g. 50'
                      value={ruleForm.reorder_quantity}
                      onChange={handleRuleFormChange}
                    />
                    {ruleFormErrors.reorder_quantity && (
                      <div className='form-err-msg'>{ruleFormErrors.reorder_quantity}</div>
                    )}
                  </div>
                </div>

                {/* Preferred Supplier Selector */}
                <div className='modal-form-group'>
                  <label htmlFor='rule-supplier'>Preferred Supplier (Optional)</label>
                  <select
                    name='preferred_supplier_id'
                    id='rule-supplier'
                    value={ruleForm.preferred_supplier_id}
                    onChange={handleRuleFormChange}
                  >
                    <option value=''>Any Supplier</option>
                    {Array.isArray(suppliers) && suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active toggle */}
                <div className='modal-form-group inline-toggle'>
                  <label className='toggle-switch-label'>
                    <input
                      type='checkbox'
                      name='is_active'
                      checked={ruleForm.is_active}
                      onChange={handleRuleFormChange}
                    />
                    <span className='slider round'></span>
                  </label>
                  <span>Enable Reorder Rule (Active Status)</span>
                </div>
              </div>

              <footer className='modal-footer'>
                <button
                  type='button'
                  className='modal-btn cancel'
                  onClick={() => setRuleModalOpen(false)}
                  disabled={ruleSubmitting}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='modal-btn submit approve'
                  disabled={ruleSubmitting}
                >
                  {ruleSubmitting ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Rule'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationDashboard;
