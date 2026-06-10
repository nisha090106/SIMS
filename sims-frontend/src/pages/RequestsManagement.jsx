import React, { useState, useEffect, useCallback } from 'react';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  LocalShipping as FulfillIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
  ErrorOutline as WarningIcon,
} from '@mui/icons-material';
import { requestAPI, warehouseAPI, inventoryAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/RequestsManagement.css';

const RequestsManagement = () => {
  const { showToast } = useToast();

  // Requests Data States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Counts and Pagination
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    fulfilled: 0,
    rejected: 0
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters State
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [departments, setDepartments] = useState([]);

  // Detail Panel / Modals State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [fulfillModalOpen, setFulfillModalOpen] = useState(false);

  // Action forms state
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Fulfill modal step/state
  const [fulfillStep, setFulfillStep] = useState(1);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [warehouseStocks, setWarehouseStocks] = useState({}); // { product_id: quantity }
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [fulfilledQuantities, setFulfilledQuantities] = useState({}); // { item_id: qty }

  // Action processing state
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch count statistics for all tabs
  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ['all', 'pending', 'approved', 'fulfilled', 'rejected'];
      const promises = statuses.map(status => {
        const params = { limit: 1 };
        if (status !== 'all') params.status = status;
        // Apply department and date filters to counts if desired, or keep general
        return requestAPI.getAll(params);
      });
      
      const results = await Promise.all(promises);
      const newCounts = {};
      statuses.forEach((status, idx) => {
        newCounts[status] = results[idx].data?.total || 0;
      });
      setCounts(newCounts);
    } catch (err) {
      console.error('Error fetching request counts:', err);
    }
  }, []);

  // Fetch Requests List
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        status: activeTab !== 'all' ? activeTab : undefined,
        department: selectedDept || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      const res = await requestAPI.getAll(params);
      if (res.data && res.data.success) {
        setRequests(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalItems(res.data.total || 0);

        // Dynamically compile department list if empty
        if (departments.length === 0) {
          const allDepts = new Set();
          res.data.data?.forEach(req => {
            if (req.department) allDepts.add(req.department);
          });
          if (allDepts.size > 0) {
            setDepartments(Array.from(allDepts).sort());
          }
        }
      } else {
        setError('Failed to fetch requests.');
      }
    } catch (err) {
      console.error('Error fetching requests list:', err);
      setError('Could not retrieve request orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, selectedDept, dateFrom, dateTo, departments.length]);

  // Initial and updates trigger
  useEffect(() => {
    fetchRequests();
    fetchCounts();
  }, [page, activeTab, selectedDept, dateFrom, dateTo, fetchRequests, fetchCounts]);

  // Reset page when tab or filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedDept, dateFrom, dateTo]);

  // Fetch warehouses list for fulfillment dropdown
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
  }, []);

  // Fetch live stocks in selected warehouse when warehouse selection or fulfill modal opens
  useEffect(() => {
    if (!fulfillModalOpen || !selectedWarehouseId || !selectedRequest) return;

    const fetchStocks = async () => {
      setLoadingStocks(true);
      try {
        const productIds = selectedRequest.items?.map(i => i.product_id) || [];
        const stockMap = {};

        // Fetch inventory records for the selected warehouse
        const res = await inventoryAPI.getAll({ warehouse_id: selectedWarehouseId, limit: 100 });
        if (res.data && res.data.success) {
          const inventoryItems = res.data.data?.inventory || [];
          inventoryItems.forEach(item => {
            stockMap[item.product_id] = item.quantity;
          });
        }
        
        // Ensure all products have a mapping (default to 0 if not found)
        productIds.forEach(id => {
          if (stockMap[id] === undefined) {
            stockMap[id] = 0;
          }
        });

        setWarehouseStocks(stockMap);

        // Prepopulate fulfilled quantities
        const initialQtys = {};
        selectedRequest.items?.forEach(item => {
          const available = stockMap[item.product_id] || 0;
          const requested = item.quantity_requested || 0;
          // default to minimum of requested vs available
          initialQtys[item.id] = Math.min(requested, available);
        });
        setFulfilledQuantities(initialQtys);

      } catch (err) {
        console.error('Error fetching warehouse stocks:', err);
        showToast('Failed to load live warehouse inventory level.', 'error');
      } finally {
        setLoadingStocks(false);
      }
    };

    fetchStocks();
  }, [fulfillModalOpen, selectedWarehouseId, selectedRequest, showToast]);

  // Handle Action Modals Trigger
  const openApproveModal = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setReviewNotes('');
    setApproveModalOpen(true);
  };

  const openRejectModal = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setReviewNotes('');
    setRejectModalOpen(true);
  };

  const openFulfillModal = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setFulfillStep(1);
    setFulfillModalOpen(true);
  };

  const viewRequestDetails = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setDetailPanelOpen(true);
  };

  // Submit Approval PATCH request
  const handleApprove = async () => {
    setSubmittingAction(true);
    try {
      const res = await requestAPI.approve(selectedRequest.id, { review_notes: reviewNotes });
      if (res.data && res.data.success) {
        showToast(`Request ${selectedRequest.request_number} approved successfully.`, 'success');
        setApproveModalOpen(false);
        fetchRequests();
        fetchCounts();
        if (detailPanelOpen) {
          // Update side panel data
          setSelectedRequest(prev => ({ ...prev, status: 'approved', review_notes: reviewNotes }));
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to approve request.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Rejection PATCH request
  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      showToast('Rejection notes are required to reject a request.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await requestAPI.reject(selectedRequest.id, { review_notes: reviewNotes });
      if (res.data && res.data.success) {
        showToast(`Request ${selectedRequest.request_number} rejected successfully.`, 'success');
        setRejectModalOpen(false);
        fetchRequests();
        fetchCounts();
        if (detailPanelOpen) {
          // Update side panel data
          setSelectedRequest(prev => ({ ...prev, status: 'rejected', review_notes: reviewNotes }));
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to reject request.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle fulfill quantity edit limit constraints
  const handleQtyFulfillChange = (itemId, val, maxRequested, maxStock) => {
    const parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 0) {
      setFulfilledQuantities(prev => ({ ...prev, [itemId]: 0 }));
      return;
    }
    
    // Constraint: Cannot exceed quantity requested or warehouse available stock
    const limit = Math.min(maxRequested, maxStock);
    const finalVal = Math.min(parsed, limit);
    setFulfilledQuantities(prev => ({ ...prev, [itemId]: finalVal }));
  };

  // Submit Fulfillment PATCH request
  const handleFulfill = async () => {
    setSubmittingAction(true);
    try {
      const payload = {
        warehouse_id: parseInt(selectedWarehouseId),
        fulfilled_items: Object.keys(fulfilledQuantities).map(itemId => ({
          request_item_id: parseInt(itemId),
          quantity_fulfilled: fulfilledQuantities[itemId]
        }))
      };

      const res = await requestAPI.fulfill(selectedRequest.id, payload);
      if (res.data && res.data.success) {
        showToast(`Request ${selectedRequest.request_number} fulfilled successfully.`, 'success');
        setFulfillModalOpen(false);
        fetchRequests();
        fetchCounts();
        if (detailPanelOpen) {
          // Reload detailed info
          const detailRes = await requestAPI.getById(selectedRequest.id);
          if (detailRes.data && detailRes.data.success) {
            setSelectedRequest(detailRes.data.data);
          }
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to fulfill request.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Helper: Format Date String
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Clean Filters
  const clearFilters = () => {
    setSelectedDept('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  // Filter requests array client-side by Search Query (Requester name or Request number)
  const filteredRequests = requests.filter(req => {
    const searchVal = searchQuery.toLowerCase().trim();
    if (!searchVal) return true;
    
    const requestNum = req.request_number?.toLowerCase() || '';
    const requesterName = req.requester_name?.toLowerCase() || '';
    return requestNum.includes(searchVal) || requesterName.includes(searchVal);
  });

  return (
    <div className="requests-management-page">
      
      {/* Page Header */}
      <header className="mgmt-page-header">
        <div className="header-title-box">
          <h1>User Requests</h1>
          <p>Review and fulfill material requests submitted by end-users</p>
        </div>
        {counts.pending > 0 && (
          <div className="pending-badge-header">
            <span className="count">{counts.pending}</span>
            <span className="label">Pending Action</span>
          </div>
        )}
      </header>

      {/* Tabs Menu */}
      <div className="mgmt-status-tabs">
        {[
          { key: 'all', label: 'All Requests' },
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'fulfilled', label: 'Fulfilled' },
          { key: 'rejected', label: 'Rejected' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''} ${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="tab-count-bubble">{counts[tab.key] || 0}</span>
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="mgmt-filters-toolbar">
        <div className="toolbar-search-input">
          <SearchIcon className="icon-search" />
          <input
            type="text"
            placeholder="Search by Request # or Requester Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-dropdown">
          <BusinessIcon className="icon-toolbar" />
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
            {/* Standard backup options */}
            {!departments.includes('IT') && <option value="IT">IT</option>}
            {!departments.includes('HR') && <option value="HR">HR</option>}
            {!departments.includes('Operations') && <option value="Operations">Operations</option>}
            {!departments.includes('Logistics') && <option value="Logistics">Logistics</option>}
          </select>
        </div>

        <div className="toolbar-date-picker">
          <CalendarIcon className="icon-toolbar" />
          <input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {(selectedDept || dateFrom || dateTo || searchQuery) && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear Filters
          </button>
        )}

        <div className="toolbar-results-count">
          Showing {filteredRequests.length} of {totalItems} requests
        </div>
      </div>

      {/* Main Requests Table */}
      <main className="mgmt-table-container">
        {loading ? (
          <div className="table-loading-state">
            <div className="spinner"></div>
            <p>Retrieving request list...</p>
          </div>
        ) : error ? (
          <div className="table-error-state">
            <WarningIcon className="err-icon" />
            <p>{error}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="table-empty-state">
            <InfoIcon className="info-icon" />
            <h3>No requests found matching search filters.</h3>
            <p>Adjust your search criteria or review other request status queues.</p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="mgmt-requests-table">
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Requester</th>
                  <th>Department</th>
                  <th>Submitted</th>
                  <th className="align-center">Items Count</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => {
                  const itemsSummaryText = `${req.item_count || 0} item${req.item_count !== 1 ? 's' : ''}`;
                  return (
                    <tr 
                      key={req.id} 
                      className={`table-row-clickable ${req.status}`}
                      onClick={(e) => viewRequestDetails(req, e)}
                    >
                      <td className="font-mono font-bold">{req.request_number}</td>
                      <td>
                        <div className="requester-name-cell">
                          <strong>{req.requester_name}</strong>
                          <span className="email-small">{req.requester?.email || ''}</span>
                        </div>
                      </td>
                      <td>{req.department || 'Not Specified'}</td>
                      <td className="date-cell">{formatDate(req.created_at)}</td>
                      <td className="align-center font-semibold">{itemsSummaryText}</td>
                      <td className="purpose-cell">
                        <em>{req.purpose}</em>
                      </td>
                      <td>
                        <span className={`badge-status ${req.status}`}>{req.status}</span>
                      </td>
                      <td className="align-right" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions-group">
                          
                          {/* View details */}
                          <button 
                            className="icon-action-btn view" 
                            title="View request details"
                            onClick={(e) => viewRequestDetails(req, e)}
                          >
                            <ViewIcon />
                          </button>

                          {/* Actions based on state */}
                          {req.status === 'pending' && (
                            <>
                              <button 
                                className="action-btn approve"
                                onClick={(e) => openApproveModal(req, e)}
                              >
                                <ApproveIcon className="btn-icon" />
                                Approve
                              </button>
                              <button 
                                className="action-btn reject"
                                onClick={(e) => openRejectModal(req, e)}
                              >
                                <RejectIcon className="btn-icon" />
                                Reject
                              </button>
                            </>
                          )}

                          {req.status === 'approved' && (
                            <button 
                              className="action-btn fulfill"
                              onClick={(e) => openFulfillModal(req, e)}
                            >
                              <FulfillIcon className="btn-icon" />
                              Fulfill
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="mgmt-table-pagination">
            <button 
              className="page-control-btn prev" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous Page
            </button>
            <span className="page-indicator">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button 
              className="page-control-btn next" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next Page
            </button>
          </div>
        )}
      </main>

      {/* Approve Request Modal */}
      {approveModalOpen && selectedRequest && (
        <div className="mgmt-modal-overlay">
          <div className="mgmt-modal-box animate-modal">
            <header className="modal-header">
              <h2>Approve Material Request</h2>
              <button className="modal-close-btn" onClick={() => setApproveModalOpen(false)}>
                <CloseIcon />
              </button>
            </header>
            
            <div className="modal-body">
              <div className="modal-request-summary">
                <p>You are approving request <strong>{selectedRequest.request_number}</strong>.</p>
                <div className="summary-details-box">
                  <div className="summary-field">
                    <span>Requester:</span>
                    <strong>{selectedRequest.requester_name}</strong>
                  </div>
                  <div className="summary-field">
                    <span>Purpose / Reason:</span>
                    <em>{selectedRequest.purpose}</em>
                  </div>
                </div>
              </div>

              <div className="modal-form-group">
                <label htmlFor="approve-notes">Review Comments / Notes (Optional)</label>
                <textarea
                  id="approve-notes"
                  rows="3"
                  placeholder="Enter approval comments, locations details or specific instructions..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>

            <footer className="modal-footer">
              <button 
                className="modal-btn cancel" 
                onClick={() => setApproveModalOpen(false)}
                disabled={submittingAction}
              >
                Cancel
              </button>
              <button 
                className="modal-btn submit approve" 
                onClick={handleApprove}
                disabled={submittingAction}
              >
                {submittingAction ? 'Approving...' : 'Approve Request'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {rejectModalOpen && selectedRequest && (
        <div className="mgmt-modal-overlay">
          <div className="mgmt-modal-box animate-modal">
            <header className="modal-header">
              <h2>Reject Material Request</h2>
              <button className="modal-close-btn" onClick={() => setRejectModalOpen(false)}>
                <CloseIcon />
              </button>
            </header>
            
            <div className="modal-body">
              <div className="modal-request-summary warning">
                <p>You are rejecting request <strong>{selectedRequest.request_number}</strong>.</p>
                <div className="summary-details-box">
                  <div className="summary-field">
                    <span>Requester:</span>
                    <strong>{selectedRequest.requester_name}</strong>
                  </div>
                  <div className="summary-field">
                    <span>Purpose / Reason:</span>
                    <em>{selectedRequest.purpose}</em>
                  </div>
                </div>
              </div>

              <div className="modal-form-group">
                <label htmlFor="reject-notes">Reason for Rejection <span className="req-asterisk">*</span></label>
                <textarea
                  id="reject-notes"
                  rows="3"
                  placeholder="Explain why this request is being rejected (required)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  required
                />
              </div>
            </div>

            <footer className="modal-footer">
              <button 
                className="modal-btn cancel" 
                onClick={() => setRejectModalOpen(false)}
                disabled={submittingAction}
              >
                Cancel
              </button>
              <button 
                className="modal-btn submit reject" 
                onClick={handleReject}
                disabled={submittingAction || !reviewNotes.trim()}
              >
                {submittingAction ? 'Rejecting...' : 'Reject Request'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Fulfill Request Modal (Multi-step) */}
      {fulfillModalOpen && selectedRequest && (
        <div className="mgmt-modal-overlay">
          <div className="mgmt-modal-box fulfill-modal animate-modal">
            <header className="modal-header">
              <h2>Fulfill Material Request ({fulfillStep === 1 ? 'Step 1: Stock Check' : 'Step 2: Confirm Fulfillment'})</h2>
              <button className="modal-close-btn" onClick={() => setFulfillModalOpen(false)}>
                <CloseIcon />
              </button>
            </header>

            {fulfillStep === 1 ? (
              // Step 1: Stock Check & Quantity Edit
              <div className="modal-body">
                <div className="warehouse-selector-row">
                  <label htmlFor="warehouse-dropdown">Select Source Warehouse:</label>
                  <select
                    id="warehouse-dropdown"
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  >
                    {warehouses.map(w => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name} ({w.location || ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fulfill-items-table-container">
                  {loadingStocks ? (
                    <div className="loading-stocks-spinner">
                      <div className="spinner"></div>
                      <p>Checking live stock levels...</p>
                    </div>
                  ) : (
                    <table className="modal-fulfill-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th className="align-center">Qty Requested</th>
                          <th className="align-center">Available Stock</th>
                          <th className="align-center">Qty to Fulfill</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.items?.map(item => {
                          const stock = warehouseStocks[item.product_id] || 0;
                          const requested = item.quantity_requested || 0;
                          const isShort = stock < requested;
                          const fulfillQty = fulfilledQuantities[item.id] || 0;

                          return (
                            <tr key={item.id}>
                              <td>
                                <div className="product-info-cell">
                                  <strong>{item.product?.name || `Product ID: ${item.product_id}`}</strong>
                                  <span className="sku">{item.product?.sku || ''}</span>
                                </div>
                              </td>
                              <td className="align-center font-semibold">{requested}</td>
                              <td className={`align-center font-bold ${isShort ? 'text-danger' : 'text-success'}`}>
                                {stock}
                              </td>
                              <td className="align-center">
                                <input
                                  type="number"
                                  className="qty-fulfill-input"
                                  min="0"
                                  max={Math.min(requested, stock)}
                                  value={fulfillQty}
                                  onChange={(e) => handleQtyFulfillChange(item.id, e.target.value, requested, stock)}
                                />
                              </td>
                              <td>
                                {isShort ? (
                                  <span className="badge-warning-stock">
                                    Not enough stock — {stock} available
                                  </span>
                                ) : (
                                  <span className="badge-success-stock">Available</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              // Step 2: Confirm Deduction Details
              <div className="modal-body">
                <div className="confirmation-summary-alert">
                  <InfoIcon className="info-icon" />
                  <div>
                    <h4>Verify Fulfill Deductions</h4>
                    <p>Submitting this form will deduct the specified stock from warehouse: <strong>{warehouses.find(w => w.warehouse_id === parseInt(selectedWarehouseId))?.name}</strong>.</p>
                  </div>
                </div>

                <div className="confirmation-deduction-list">
                  <h3>Items Fulfill Checklist:</h3>
                  <div className="checklist-stack">
                    {selectedRequest.items?.map(item => {
                      const qty = fulfilledQuantities[item.id] || 0;
                      return (
                        <div key={item.id} className="checklist-item-row">
                          <span className="item-name">{item.product?.name}</span>
                          <div className="item-qtys">
                            <span>Requested: <strong>{item.quantity_requested}</strong></span>
                            <span className="arrow">→</span>
                            <span>Fulfilling: <strong className="txt-highlight">{qty}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <footer className="modal-footer">
              <button 
                className="modal-btn cancel" 
                onClick={() => setFulfillModalOpen(false)}
                disabled={submittingAction}
              >
                Cancel
              </button>

              {fulfillStep === 1 ? (
                <button 
                  className="modal-btn submit approve" 
                  onClick={() => setFulfillStep(2)}
                  disabled={loadingStocks || selectedRequest.items?.length === 0}
                >
                  Continue to Confirm
                </button>
              ) : (
                <>
                  <button 
                    className="modal-btn secondary" 
                    onClick={() => setFulfillStep(1)}
                    disabled={submittingAction}
                  >
                    Back to Check
                  </button>
                  <button 
                    className="modal-btn submit fulfill" 
                    onClick={handleFulfill}
                    disabled={submittingAction}
                  >
                    {submittingAction ? 'Processing Stock Deduction...' : 'Confirm Fulfillment'}
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* Sliding Request Detail Panel (View Icon) */}
      <div className={`detail-side-panel ${detailPanelOpen ? 'open' : ''}`}>
        {selectedRequest && (
          <div className="panel-inner-container">
            <header className="panel-header">
              <div className="header-labels">
                <span className="request-code">{selectedRequest.request_number}</span>
                <span className={`badge-status ${selectedRequest.status}`}>{selectedRequest.status}</span>
              </div>
              <button className="panel-close-btn" onClick={() => setDetailPanelOpen(false)}>
                <CloseIcon />
              </button>
            </header>

            <main className="panel-content-body">
              {/* Requester Info */}
              <section className="panel-section">
                <h3>Requester Information</h3>
                <div className="info-grid">
                  <div className="grid-cell">
                    <span className="lbl">Name</span>
                    <strong className="val">{selectedRequest.requester_name}</strong>
                  </div>
                  <div className="grid-cell">
                    <span className="lbl">Department</span>
                    <span className="val">{selectedRequest.department || 'Not Specified'}</span>
                  </div>
                  <div className="grid-cell full-span">
                    <span className="lbl">Purpose Description</span>
                    <p className="val-desc">{selectedRequest.purpose}</p>
                  </div>
                </div>
              </section>

              {/* Status Timeline */}
              <section className="panel-section">
                <h3>Status Timeline</h3>
                <div className="visual-stepper">
                  
                  {/* Step 1: Submitted */}
                  <div className="stepper-node active">
                    <div className="node-marker">1</div>
                    <div className="node-meta">
                      <strong>Submitted</strong>
                      <span>{formatDateOnly(selectedRequest.created_at)}</span>
                    </div>
                  </div>

                  {/* Step 2: Reviewed */}
                  <div className={`stepper-node ${['approved', 'rejected', 'fulfilled'].includes(selectedRequest.status) ? 'active' : ''} ${selectedRequest.status === 'rejected' ? 'rejected' : ''}`}>
                    <div className="node-marker">2</div>
                    <div className="node-meta">
                      <strong>{selectedRequest.status === 'rejected' ? 'Rejected' : 'Reviewed'}</strong>
                      <span>{selectedRequest.reviewed_at ? formatDateOnly(selectedRequest.reviewed_at) : 'Pending'}</span>
                    </div>
                  </div>

                  {/* Step 3: Fulfilled */}
                  <div className={`stepper-node ${selectedRequest.status === 'fulfilled' ? 'active' : ''}`}>
                    <div className="node-marker">3</div>
                    <div className="node-meta">
                      <strong>Fulfilled</strong>
                      <span>{selectedRequest.fulfilled_at ? formatDateOnly(selectedRequest.fulfilled_at) : 'Pending'}</span>
                    </div>
                  </div>

                </div>
              </section>

              {/* Review History */}
              {['approved', 'rejected', 'fulfilled'].includes(selectedRequest.status) && (
                <section className="panel-section review-history-panel">
                  <h3>Review Details</h3>
                  <div className="review-details-box">
                    <p>
                      <strong>Reviewed By:</strong>{' '}
                      {selectedRequest.reviewer 
                        ? `${selectedRequest.reviewer.first_name || ''} ${selectedRequest.reviewer.last_name || ''}`.trim()
                        : 'Logistics Manager'}{' '}
                      {selectedRequest.reviewed_at && `on ${formatDateOnly(selectedRequest.reviewed_at)}`}
                    </p>
                    {selectedRequest.review_notes && (
                      <div className="review-notes-container">
                        <strong>Notes:</strong> "{selectedRequest.review_notes}"
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Items Table List */}
              <section className="panel-section">
                <h3>Requested Items</h3>
                <div className="items-table-wrapper">
                  <table className="panel-items-table">
                    <thead>
                      <tr>
                        <th>Product SKU</th>
                        <th>Name</th>
                        <th className="align-center">Qty Requested</th>
                        <th className="align-center">Qty Fulfilled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items?.map(item => (
                        <tr key={item.id}>
                          <td className="font-mono">{item.product?.sku || 'N/A'}</td>
                          <td>
                            <strong>{item.product?.name || `ID: ${item.product_id}`}</strong>
                          </td>
                          <td className="align-center">{item.quantity_requested}</td>
                          <td className="align-center text-success">
                            {selectedRequest.status === 'fulfilled'
                              ? (item.quantity_fulfilled !== null ? item.quantity_fulfilled : item.quantity_requested)
                              : (item.quantity_fulfilled !== null ? item.quantity_fulfilled : 0)
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>

            <footer className="panel-footer-actions">
              {selectedRequest.status === 'pending' && (
                <>
                  <button 
                    className="action-btn approve"
                    onClick={(e) => openApproveModal(selectedRequest, e)}
                  >
                    <ApproveIcon className="btn-icon" />
                    Approve
                  </button>
                  <button 
                    className="action-btn reject"
                    onClick={(e) => openRejectModal(selectedRequest, e)}
                  >
                    <RejectIcon className="btn-icon" />
                    Reject
                  </button>
                </>
              )}

              {selectedRequest.status === 'approved' && (
                <button 
                  className="action-btn fulfill"
                  onClick={(e) => openFulfillModal(selectedRequest, e)}
                >
                  <FulfillIcon className="btn-icon" />
                  Fulfill
                </button>
              )}
              
              <button className="action-btn close-panel" onClick={() => setDetailPanelOpen(false)}>
                Close Panel
              </button>
            </footer>
          </div>
        )}
      </div>

    </div>
  );
};

export default RequestsManagement;
