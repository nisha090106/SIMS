import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Autorenew as AutoIcon,
  PlayArrow as RunIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  History as LogsIcon,
} from '@mui/icons-material';
import { automationAPI, warehouseAPI, productAPI, supplierAPI } from '../services/api';
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

  // Initial data loading
  useEffect(() => {
    fetchCronJobStatuses();
    fetchReorderRules();

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
          <p>Control background cron jobs, configure reorder rules, and view execution logs</p>
        </div>
      </header>

      {/* Section: Cron Jobs */}
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

      {/* Section: Reorder Rules */}
      <section className='auto-section-block'>
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
      {/* Section: Execution Audit Logs */}
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
