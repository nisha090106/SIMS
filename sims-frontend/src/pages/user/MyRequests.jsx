import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import {
  Add as AddIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Info as InfoIcon,
  AssignmentTurnedIn as FulfilledIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { requestAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import '../../styles/MyRequests.css';

const MyRequests = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  // Requests Data State
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeStatus, setActiveStatus] = useState('all');
  const [expandedIds, setExpandedIds] = useState([]);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch Requests
  const fetchRequests = async (pageNum, statusFilter, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pageNum,
        limit: 10,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await requestAPI.getMyRequests(params);
      if (res.data && res.data.success) {
        const newRequests = res.data.data;
        if (append) {
          setRequests((prev) => [...prev, ...newRequests]);
        } else {
          setRequests(newRequests);
        }
        setTotalPages(res.data.totalPages || 1);
        setPage(res.data.page || 1);
      } else {
        setError('Failed to fetch requests.');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Could not retrieve request history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial Fetch & Filter changes
  useEffect(() => {
    fetchRequests(1, activeStatus, false);
    setExpandedIds([]);
  }, [activeStatus]);

  // Load More Handler
  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchRequests(page + 1, activeStatus, true);
    }
  };

  // Status Tab Changes
  const handleTabChange = (status) => {
    setActiveStatus(status);
  };

  // Card Expand Toggle
  const toggleExpandCard = (id) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Cancel Request Order
  const handleCancelRequest = async (e, id, requestNumber) => {
    e.stopPropagation(); // Avoid triggering card expand
    if (!window.confirm(`Are you sure you want to cancel request ${requestNumber}?`)) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await requestAPI.cancel(id);
      if (res.data && res.data.success) {
        showToast(`Request ${requestNumber} cancelled successfully.`, 'success');

        // Update requests array in state locally
        setRequests((prev) =>
          prev.map((req) => (req.id === id ? { ...req, status: 'cancelled' } : req)),
        );
      }
    } catch (err) {
      console.error('Failed to cancel request:', err);
      const errMsg = err.response?.data?.error || 'Could not cancel request.';
      showToast(errMsg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  // Helper: Format Date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  // Helper: Format Date Only
  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get Items Summary text
  const getItemsSummary = (items) => {
    if (!items || items.length === 0) return '0 items';
    const count = items.reduce((sum, item) => sum + item.quantity_requested, 0);
    const names = items
      .map((item) => item.product?.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    const extra = items.length > 3 ? '...' : '';
    return `${count} item${count !== 1 ? 's' : ''} — ${names}${extra}`;
  };

  return (
    <div className='my-requests-page'>
      {/* Page Header */}
      <header className='requests-page-header'>
        <div className='header-text-block'>
          <h1>My Requests</h1>
          <p>Monitor status, review approver notes, or cancel pending material requests</p>
        </div>
        <button className='requests-new-cta' onClick={() => navigate('/user/catalog')}>
          <AddIcon />
          <span>New Request</span>
        </button>
      </header>

      {/* Filter Tabs */}
      <div className='requests-status-tabs-container'>
        {[
          { label: 'All Requests', value: 'all' },
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Fulfilled', value: 'fulfilled' },
          { label: 'Rejected', value: 'rejected' },
          { label: 'Cancelled', value: 'cancelled' },
        ].map((tab) => (
          <button
            key={tab.value}
            className={`status-tab-btn ${activeStatus === tab.value ? 'active' : ''} ${tab.value}`}
            onClick={() => handleTabChange(tab.value)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Requests Content */}
      <main className='requests-list-container'>
        {loading && requests.length === 0 ? (
          <div className='list-loading-box'>
            <div className='loader'></div>
            <p>Loading requests list...</p>
          </div>
        ) : error ? (
          <div className='list-error-box'>
            <ErrorIcon className='err-icon' />
            <p>{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className='list-empty-box'>
            <h3>You haven't made any requests yet.</h3>
            <p>Browse the catalog to find the items you need to submit a request order.</p>
            <button className='empty-cta' onClick={() => navigate('/user/catalog')}>
              Browse Product Catalog
            </button>
          </div>
        ) : (
          <div className='requests-card-stack'>
            {requests.map((req) => {
              const isExpanded = expandedIds.includes(req.id);
              const itemsCount = req.items ? req.items.length : 0;
              const reviewerName = req.reviewer
                ? `${req.reviewer.first_name || ''} ${req.reviewer.last_name || ''}`.trim()
                : null;

              return (
                <div
                  key={req.id}
                  className={`request-item-card ${req.status} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleExpandCard(req.id)}
                >
                  {/* Card Header (Request Number & Date) */}
                  <div className='card-header-row'>
                    <span className='request-number-txt'>{req.request_number}</span>
                    <span className='request-date-txt'>{formatDate(req.created_at)}</span>
                  </div>

                  {/* Status Badge & Summary Info */}
                  <div className='card-meta-summary'>
                    <span className={`status-badge-indicator ${req.status}`}>{req.status}</span>
                    <span className='summary-items-list'>{getItemsSummary(req.items)}</span>
                  </div>

                  {/* Purpose (italicized, truncated) */}
                  <p className='card-purpose-summary'>
                    <em>{req.purpose}</em>
                  </p>

                  {/* Conditional Tags */}
                  {req.status === 'fulfilled' && req.fulfilled_at && (
                    <div className='badge-tag fulfilled-info'>
                      <span>Fulfilled on {formatDateOnly(req.fulfilled_at)}</span>
                    </div>
                  )}

                  {req.status === 'rejected' && req.review_notes && (
                    <div className='badge-tag rejected-info'>
                      <span>Rejected — {req.review_notes}</span>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className='card-actions-toolbar' onClick={(e) => e.stopPropagation()}>
                    <button
                      className='card-action-btn toggle-details'
                      onClick={() => toggleExpandCard(req.id)}
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </button>
                    {req.status === 'pending' && (
                      <button
                        className='card-action-btn cancel-request'
                        onClick={(e) => handleCancelRequest(e, req.id, req.request_number)}
                        disabled={isCancelling}
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>

                  {/* Expanded Detail View Content */}
                  {isExpanded && (
                    <div className='expanded-card-contents'>
                      <div className='details-info-grid'>
                        <div className='info-cell'>
                          <span className='lbl'>Department / Location</span>
                          <span className='val'>{req.department || 'Not Specified'}</span>
                        </div>
                        <div className='info-cell full-span'>
                          <span className='lbl'>Reason / Purpose of Request</span>
                          <span className='val'>{req.purpose}</span>
                        </div>
                      </div>

                      {/* Review details if reviewed */}
                      {['approved', 'rejected', 'fulfilled'].includes(req.status) && (
                        <div className={`details-review-notes ${req.status}`}>
                          <strong>Review Comments:</strong>
                          <p>
                            {reviewerName
                              ? `Reviewed by ${reviewerName}`
                              : 'Reviewed by Logistics Team'}{' '}
                            {req.reviewed_at && `on ${formatDateOnly(req.reviewed_at)}`}
                          </p>
                          {req.review_notes && (
                            <div className='notes-block'>
                              <strong>Reviewer Notes:</strong> "{req.review_notes}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Visual Progress Timeline Steps */}
                      <div className='visual-timeline-box'>
                        <div className='timeline-steps'>
                          {/* Step 1: Submitted */}
                          <div className='timeline-step active'>
                            <div className='step-circle'>1</div>
                            <div className='step-label'>Submitted</div>
                            <div className='step-date'>{formatDateOnly(req.created_at)}</div>
                          </div>

                          {/* Step 2: Reviewed */}
                          <div
                            className={`timeline-step ${['approved', 'rejected', 'fulfilled'].includes(req.status) ? 'active' : ''} ${req.status === 'rejected' ? 'rejected' : ''}`}
                          >
                            <div className='step-circle'>2</div>
                            <div className='step-label'>
                              {req.status === 'rejected' ? 'Rejected' : 'Reviewed'}
                            </div>
                            <div className='step-date'>
                              {req.reviewed_at ? formatDateOnly(req.reviewed_at) : ''}
                            </div>
                          </div>

                          {/* Step 3: Fulfilled */}
                          <div
                            className={`timeline-step ${req.status === 'fulfilled' ? 'active' : ''}`}
                          >
                            <div className='step-circle'>3</div>
                            <div className='step-label'>Fulfilled</div>
                            <div className='step-date'>
                              {req.fulfilled_at ? formatDateOnly(req.fulfilled_at) : ''}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Item Details Table */}
                      <div className='details-items-table-box'>
                        <h4>Requested Items List</h4>
                        <div className='table-responsive'>
                          <table className='details-cart-table'>
                            <thead>
                              <tr>
                                <th>Product SKU</th>
                                <th>Product Name</th>
                                <th className='align-center'>Qty Requested</th>
                                <th className='align-center'>Qty Fulfilled</th>
                                <th>Unit</th>
                                <th>Item Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {req.items?.map((item) => (
                                <tr key={item.id}>
                                  <td className='font-mono'>{item.product?.sku || 'N/A'}</td>
                                  <td>
                                    <strong>
                                      {item.product?.name || `ID: ${item.product_id}`}
                                    </strong>
                                  </td>
                                  <td className='align-center'>{item.quantity_requested}</td>
                                  <td className='align-center text-success'>
                                    {req.status === 'fulfilled'
                                      ? item.quantity_fulfilled !== null
                                        ? item.quantity_fulfilled
                                        : item.quantity_requested
                                      : item.quantity_fulfilled !== null
                                        ? item.quantity_fulfilled
                                        : 0}
                                  </td>
                                  <td>{item.product?.unit || 'piece'}</td>
                                  <td>
                                    <span className='color-muted font-sm'>
                                      {item.notes || 'No notes'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {page < totalPages && !loading && (
          <div className='load-more-container'>
            <button className='load-more-btn' onClick={handleLoadMore}>
              Load More Requests
            </button>
          </div>
        )}

        {loading && requests.length > 0 && (
          <div className='list-loading-more-spinner'>Loading next page...</div>
        )}
      </main>
    </div>
  );
};

export default MyRequests;
