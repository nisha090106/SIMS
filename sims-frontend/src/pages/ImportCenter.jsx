import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  History as HistoryIcon,
  ArrowDropDown as DropDownIcon,
  ArrowDropUp as DropUpIcon,
} from '@mui/icons-material';
import { importAPI, warehouseAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/ImportCenter.css';

const ImportCenter = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Tabs: 'products' | 'stock' | 'warehouses'
  const [activeTab, setActiveTab] = useState('products');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Warehouse Selection for Stock Import
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Active Upload / Progress States
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [polling, setPolling] = useState(false);

  // Import History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Fetch History List
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await importAPI.getHistory();
      if (res.data && res.data.success) {
        setHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Fetch warehouses list on mount
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await warehouseAPI.getAll();
        if (res.data && res.data.success) {
          setWarehouses(res.data.data || []);
          if (res.data.data?.length > 0) {
            setSelectedWarehouseId(res.data.data[0].warehouse_id);
          }
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    };
    fetchWarehouses();
    fetchHistory();
  }, [fetchHistory]);

  // Polling import job status every 2 seconds
  useEffect(() => {
    if (!activeJobId || !polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await importAPI.getJobStatus(activeJobId);
        if (res.data && res.data.success) {
          const job = res.data.data;
          setActiveJob(job);
          
          if (job.status === 'completed' || job.status === 'failed') {
            setPolling(false);
            showToast(`Import job finished with status: ${job.status}`, job.status === 'completed' ? 'success' : 'error');
            setSelectedFile(null); // Clear selected file
            fetchHistory(); // Refresh history
          }
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
        setPolling(false);
        showToast('Error occurred while fetching import progress.', 'error');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobId, polling, fetchHistory, showToast]);

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelectChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Validate File type and size
  const validateAndSetFile = (file) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      showToast('Invalid file format. Please upload CSV or Excel (.xlsx, .xls) files.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      showToast('File is too large. Maximum supported size is 10MB.', 'error');
      return;
    }

    setSelectedFile(file);
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  // Submit file upload
  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      showToast('Please select a file to import.', 'error');
      return;
    }

    if (activeTab === 'stock' && !selectedWarehouseId) {
      showToast('Please select a warehouse for stock import.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Map tab type to import type matching backend validator
    // Backend expects: product, stock, warehouse
    let typeParam = 'product';
    if (activeTab === 'stock') typeParam = 'stock';
    else if (activeTab === 'warehouses') typeParam = 'warehouse';
    
    formData.append('import_type', typeParam);
    if (activeTab === 'stock') {
      formData.append('warehouse_id', selectedWarehouseId);
    }

    try {
      setActiveJob(null);
      setActiveJobId(null);
      const res = await importAPI.upload(formData);
      
      if (res.data && res.data.success) {
        showToast('File uploaded. Starting bulk import...', 'success');
        setActiveJobId(res.data.jobId);
        setActiveJob({
          status: 'pending',
          file_name: selectedFile.name,
          processed_rows: 0,
          failed_rows: 0,
          total_rows: 0
        });
        setPolling(true);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to start import job.', 'error');
    }
  };

  // Download Import Templates
  const handleDownloadTemplate = async (type) => {
    try {
      const res = await importAPI.downloadTemplate(type);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_import_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download template:', err);
      showToast('Failed to download import template.', 'error');
    }
  };

  // Download Error Logs Summary
  const handleDownloadErrorReport = (job) => {
    try {
      const errors = typeof job.error_log === 'string' ? JSON.parse(job.error_log) : job.error_log;
      if (!errors) return;
      const text = JSON.stringify(errors, null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `import_${job.id}_error_report.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showToast('Failed to download error report.', 'error');
    }
  };

  // Toggle rows in import history
  const toggleHistoryRow = (id) => {
    setExpandedJobId(prev => (prev === id ? null : id));
  };

  // Template Tables headers and sample rows preview mapping
  const getTemplatePreview = () => {
    if (activeTab === 'products') {
      return {
        headers: ['name', 'sku', 'category', 'unit', 'unit_price', 'reorder_level', 'reorder_qty', 'description', 'barcode'],
        samples: [
          ['Wireless Mouse', 'MS-WIRE-01', 'Electronics', 'piece', '25.99', '15', '50', 'Ergonomic mouse', '190128456012'],
          ['USB-C Hub', 'HUB-UC-05', 'Electronics', 'piece', '45.00', '10', '30', '5-in-1 multi port adapter', '190128456088']
        ]
      };
    } else if (activeTab === 'stock') {
      return {
        headers: ['sku', 'barcode', 'quantity', 'location'],
        samples: [
          ['MS-WIRE-01', '190128456012', '120', 'Rack A-3'],
          ['HUB-UC-05', '190128456088', '85', 'Bin B-12']
        ]
      };
    } else {
      return {
        headers: ['name', 'location', 'address', 'capacity', 'manager_email'],
        samples: [
          ['North Warehouse', 'New York', '100 Logistics Blvd Suite 10', '50000.00', 'manager@sims.com'],
          ['Central Depot', 'Chicago', '550 Interstate Ave', '120000.00', 'depot@sims.com']
        ]
      };
    }
  };

  const template = getTemplatePreview();

  // Helper: Format Date String
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="import-center-page">
      
      {/* Page Header */}
      <header className="import-page-header">
        <div className="header-info">
          <h1>Import Center</h1>
          <p>Bulk import products, stock, or warehouses using CSV or Excel files</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="import-tabs-header">
        {[
          { id: 'products', label: 'Import Products', templateType: 'products' },
          { id: 'stock', label: 'Import Stock', templateType: 'stock' },
          { id: 'warehouses', label: 'Import Warehouses', templateType: 'warehouses' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`import-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedFile(null); // Clear selected file when switching tabs
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="import-main-grid">
        
        {/* Upload Panel */}
        <section className="upload-section-panel">
          
          {/* Dashboard template downloader */}
          <div className="template-downloader-header">
            <h3>Upload File</h3>
            <button 
              className="download-template-link"
              onClick={() => handleDownloadTemplate(activeTab === 'products' ? 'products' : activeTab === 'stock' ? 'stock' : 'warehouses')}
            >
              Download Template ({activeTab.toUpperCase()})
            </button>
          </div>

          {/* Additional Input Form for Stock Import */}
          {activeTab === 'stock' && (
            <div className="stock-additional-form">
              <label htmlFor="import-warehouse-selector">Target Warehouse for Stock <span className="req-asterisk">*</span></label>
              <select
                id="import-warehouse-selector"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                required
              >
                <option value="">-- Select Target Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div 
            className={`drag-drop-zone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerBrowse}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelectChange} 
              style={{ display: 'none' }}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            />
            
            <UploadIcon className="upload-icon-graphic" />
            
            {selectedFile ? (
              <div className="file-info-selected">
                <FileIcon className="file-icon" />
                <div className="meta">
                  <span className="filename">{selectedFile.name}</span>
                  <span className="size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            ) : (
              <div className="prompt-text">
                <p>Drag and drop your CSV or Excel file here, or <span>click to browse</span></p>
                <span className="subtext">Supported formats: CSV, XLSX, XLS (Max size: 10MB)</span>
              </div>
            )}
          </div>

          {/* Confirm Button */}
          {selectedFile && (
            <div className="upload-actions-bar">
              <button className="cancel-upload-btn" onClick={() => setSelectedFile(null)}>
                Clear File
              </button>
              <button className="confirm-upload-btn" onClick={handleUploadSubmit}>
                Start Bulk Import
              </button>
            </div>
          )}

          {/* Table Preview */}
          <div className="template-preview-box">
            <h4>Expected Columns Template Format:</h4>
            <div className="table-responsive">
              <table className="preview-columns-table">
                <thead>
                  <tr>
                    {template.headers.map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {template.samples.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((val, vIdx) => <td key={vIdx}>{val}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>

        {/* Live Progress / Active Status Section */}
        {activeJob && (
          <section className="import-progress-panel">
            <h3>Active Import Progress</h3>
            <div className="progress-details-card">
              <div className="progress-card-header">
                <span className="filename">{activeJob.file_name}</span>
                <span className={`status-badge-inline ${activeJob.status}`}>
                  {activeJob.status}
                </span>
              </div>

              {/* Progress Bar calculations */}
              {activeJob.status === 'processing' || activeJob.status === 'completed' || activeJob.status === 'failed' ? (
                <div className="progress-metric-box">
                  <div className="live-progress-bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${activeJob.total_rows > 0 
                          ? Math.round(((activeJob.processed_rows + activeJob.failed_rows) / activeJob.total_rows) * 100) 
                          : activeJob.status === 'completed' ? 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  
                  <div className="progress-percentage-label">
                    {activeJob.total_rows > 0 
                      ? Math.round(((activeJob.processed_rows + activeJob.failed_rows) / activeJob.total_rows) * 100) 
                      : activeJob.status === 'completed' ? 100 : 0}% Processed
                  </div>

                  <div className="live-progress-metrics">
                    <div className="metric">
                      <span className="lbl">Processed Rows</span>
                      <strong className="val text-success">{activeJob.processed_rows}</strong>
                    </div>
                    <div className="metric">
                      <span className="lbl">Failed Rows</span>
                      <strong className="val text-danger">{activeJob.failed_rows}</strong>
                    </div>
                    <div className="metric">
                      <span className="lbl">Total Rows</span>
                      <strong className="val">{activeJob.total_rows}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pending-loader-state">
                  <div className="loader"></div>
                  <p>Queuing job, please stand by...</p>
                </div>
              )}

              {/* Errors logs review in active progress */}
              {activeJob.status === 'completed' && activeJob.failed_rows > 0 && (
                <div className="active-error-logs-box">
                  <div className="box-header">
                    <h4>Failed Import Log Details</h4>
                    <button 
                      className="download-errors-btn"
                      onClick={() => handleDownloadErrorReport(activeJob)}
                    >
                      Download Error Report
                    </button>
                  </div>
                  <div className="errors-scroller">
                    {(() => {
                      try {
                        const parsed = typeof activeJob.error_log === 'string' ? JSON.parse(activeJob.error_log) : activeJob.error_log;
                        if (!parsed || parsed.length === 0) return <p className="no-errors">No error summary available.</p>;
                        return parsed.map((err, idx) => (
                          <div key={idx} className="error-item">
                            <span className="row-num">Row {err.row || idx + 1}</span>
                            <span className="err-desc">{err.error || err.message}</span>
                          </div>
                        ));
                      } catch (e) {
                        return <p className="error-log-raw">{activeJob.error_log}</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {activeJob.status === 'failed' && (
                <div className="job-fatal-error-message">
                  <ErrorIcon />
                  <div>
                    <strong>Job Processing Failed</strong>
                    <p>{activeJob.error_log || 'An unexpected error occurred during database import.'}</p>
                  </div>
                </div>
              )}

            </div>
          </section>
        )}

      </div>

      {/* History Section */}
      <section className="import-history-panel-bottom">
        
        <header className="history-header">
          <HistoryIcon />
          <h3>Import History Logs</h3>
        </header>

        {loadingHistory ? (
          <div className="history-loading">
            <div className="spinner"></div>
            <p>Loading history records...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            <p>No import jobs recorded yet.</p>
          </div>
        ) : (
          <div className="table-responsive history-table-wrapper">
            <table className="history-log-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Job Type</th>
                  <th>File Name</th>
                  <th>Status</th>
                  <th className="align-center">Total Rows</th>
                  <th className="align-center">Processed</th>
                  <th className="align-center">Failed</th>
                  <th>Triggered By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map(job => {
                  const isExpanded = expandedJobId === job.id;
                  const typeLabel = job.job_type ? job.job_type.replace('_', ' ') : 'Import';
                  const triggeredName = job.triggeredBy 
                    ? `${job.triggeredBy.first_name || ''} ${job.triggeredBy.last_name || ''}`.trim()
                    : 'System';

                  return (
                    <React.Fragment key={job.id}>
                      <tr 
                        className={`history-row-clickable ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleHistoryRow(job.id)}
                      >
                        <td>{formatDateTime(job.created_at)}</td>
                        <td className="text-capitalize">{typeLabel}</td>
                        <td className="font-mono">{job.file_name}</td>
                        <td>
                          <span className={`badge-status-history ${job.status}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="align-center font-bold">{job.total_rows}</td>
                        <td className="align-center text-success font-semibold">{job.processed_rows}</td>
                        <td className="align-center text-danger font-semibold">{job.failed_rows}</td>
                        <td>{triggeredName}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="history-actions">
                            <button 
                              className="view-logs-toggle"
                              onClick={() => toggleHistoryRow(job.id)}
                            >
                              <span>{isExpanded ? 'Hide' : 'Errors'}</span>
                              {isExpanded ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                            </button>
                            {job.failed_rows > 0 && job.error_log && (
                              <button 
                                className="download-error-report"
                                onClick={() => handleDownloadErrorReport(job)}
                                title="Download complete failure log report"
                              >
                                Download
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expansible Error Log row */}
                      {isExpanded && (
                        <tr className="history-expansion-row">
                          <td colSpan="9">
                            <div className="history-expanded-logs-container">
                              <h4>Import Job #{job.id} Error Summary Details</h4>
                              
                              {!job.error_log ? (
                                <p className="no-errors">No errors logged. Import was fully successful.</p>
                              ) : (
                                <div className="expanded-errors-grid">
                                  <div className="meta-stats">
                                    <span>Failed Rows: <strong>{job.failed_rows}</strong></span>
                                    <span>Total File Rows: <strong>{job.total_rows}</strong></span>
                                  </div>
                                  <div className="errors-list-box">
                                    {(() => {
                                      try {
                                        const parsed = typeof job.error_log === 'string' ? JSON.parse(job.error_log) : job.error_log;
                                        if (!parsed || parsed.length === 0) return <p className="no-errors">No error summary available.</p>;
                                        return parsed.map((err, idx) => (
                                          <div key={idx} className="error-log-item-row">
                                            <strong className="row-num text-danger">Row {err.row || idx + 1}:</strong>
                                            <span className="reason">{err.error || err.message}</span>
                                          </div>
                                        ));
                                      } catch (e) {
                                        return <pre className="raw-log-dump">{job.error_log}</pre>;
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
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

      </section>

    </div>
  );
};

export default ImportCenter;
