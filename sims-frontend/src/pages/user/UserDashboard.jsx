import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  LocalShipping as ShippingIcon,
  ArrowForward as ArrowIcon,
  Close as CloseIcon,
  FolderOpen as FolderIcon,
  HourglassEmpty as ClockIcon,
  Business as DeptIcon,
  Message as MsgIcon,
} from '@mui/icons-material';
import { requestAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import '../../styles/UserDashboard.css';

const UserDashboard = ({ defaultTab = 'dashboard' }) => {
  const { user } = useSelector((state) => state.auth);
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || defaultTab;

  // State
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  // Cart: { [productId]: { quantity, product } }
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem(`cart_${user?.id}`);
    return savedCart ? JSON.parse(savedCart) : {};
  });

  const [purpose, setPurpose] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Announcement banner
  const [announcementDismissed, setAnnouncementDismissed] = useState(() => {
    return localStorage.getItem('user_announcement_dismissed') === 'true';
  });

  // Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Save cart to local storage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    }
  }, [cart, user?.id]);

  // Fetch Catalog Data
  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      // Get all items (high limit to support local grouping and filtering)
      const res = await requestAPI.getCatalog({ page: 1, limit: 100 });
      if (res.data && res.data.success) {
        setCatalog(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
      setCatalogError('Could not load inventory catalog. Please try again.');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Fetch Requests Data
  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await requestAPI.getMyRequests({ page: 1, limit: 100 });
      if (res.data && res.data.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
      setRequestsError('Could not retrieve your request history.');
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchRequests();
  }, []);

  // Sync category filter from URL if present
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setCatalogCategory(cat);
      // Clean up search param so it doesn't get stuck, but keep tab=catalog
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('category');
      setSearchParams(newParams);
    }
  }, [searchParams]);

  // Handle active tab change
  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // Get unique categories and their counts from catalog
  const getCategories = () => {
    const counts = {};
    catalog.forEach((item) => {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  };

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hr = new Date().getHours();
    const name = user?.full_name || user?.name || 'User';
    if (hr < 12) return `Good morning, ${name}!`;
    if (hr < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  // Cart operations
  const addToCart = (product) => {
    if (product.availability_status === 'out_of_stock') {
      showToast('This item is currently out of stock and cannot be requested.', 'warning');
      return;
    }
    setCart((prev) => {
      const existing = prev[product.id];
      const qty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [product.id]: { quantity: qty, product },
      };
    });
    showToast(`Added ${product.name} to request cart.`, 'success');
  };

  const updateCartQuantity = (productId, amount) => {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      const newQty = item.quantity + amount;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: { ...item, quantity: newQty },
      };
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    showToast('Item removed from cart.', 'info');
  };

  // Submit Request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) {
      showToast('Your cart is empty. Please select products from the catalog.', 'error');
      return;
    }
    if (!purpose.trim()) {
      showToast('Please specify the purpose of your request.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        purpose,
        department: department.trim() || null,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity_requested: item.quantity,
          notes: '',
        })),
      };

      const res = await requestAPI.create(payload);
      if (res.data && res.data.success) {
        showToast('Request submitted successfully!', 'success');
        setCart({});
        setPurpose('');
        setDepartment('');
        fetchRequests(); // Refresh requests list
        setTab('requests'); // Switch to requests tab
      }
    } catch (err) {
      console.error('Request creation failed:', err);
      const errMsg = err.response?.data?.error || 'Failed to submit request. Please try again.';
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Request
  const handleCancelRequest = async (id, requestNumber) => {
    if (!window.confirm(`Are you sure you want to cancel request ${requestNumber}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestAPI.cancel(id);
      if (res.data && res.data.success) {
        showToast(`Request ${requestNumber} cancelled successfully.`, 'success');
        fetchRequests(); // Refresh list
        if (selectedRequest && selectedRequest.id === id) {
          // Update details modal if it's currently open
          setSelectedRequest({ ...selectedRequest, status: 'cancelled' });
        }
      }
    } catch (err) {
      console.error('Cancellation failed:', err);
      const errMsg = err.response?.data?.error || 'Failed to cancel request.';
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Details Modal
  const openDetailsModal = (request) => {
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
  };

  // Date Formatting helper
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

  // Filter Catalog
  const filteredCatalog = catalog.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCategory = catalogCategory ? product.category === catalogCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Calculate requests counts by status
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const fulfilledCount = requests.filter((r) => r.status === 'fulfilled').length;

  const dismissAnnouncement = () => {
    localStorage.setItem('user_announcement_dismissed', 'true');
    setAnnouncementDismissed(true);
  };

  return (
    <div className='user-dashboard'>
      {/* 1. WELCOME & ANNOUNCEMENT BANNER */}
      {activeTab === 'dashboard' && (
        <>
          <div className='welcome-banner'>
            <div className='welcome-content'>
              <h1 className='welcome-title'>{getGreeting()}</h1>
              <p className='welcome-subtitle'>
                Search the central catalog, add items to your cart, and submit requests for
                immediate fulfillment by logistics staff.
              </p>
              <button className='new-request-cta' onClick={() => setTab('catalog')}>
                <span>Create New Request</span>
                <ArrowIcon className='cta-icon' />
              </button>
            </div>
            <div className='welcome-illustration'>
              <CartIcon className='ill-icon' />
            </div>
          </div>

          {!announcementDismissed && (
            <div className='announcement-banner'>
              <div className='announcement-content'>
                <InfoIcon className='ann-icon' />
                <span className='ann-text'>
                  <strong>Need items urgently?</strong> Contact the main inventory logistics team
                  directly at <a href='mailto:inventory@company.com'>inventory@company.com</a> for
                  expedited approval.
                </span>
              </div>
              <button className='ann-close-btn' onClick={dismissAnnouncement} aria-label='Dismiss'>
                <CloseIcon />
              </button>
            </div>
          )}
        </>
      )}

      {/* TABS CONTAINER FOR CATALOG & REQUESTS VIEWS */}
      {activeTab === 'dashboard' && (
        <div className='dashboard-grid'>
          {/* LEFT: STATS & RECENT REQUESTS */}
          <div className='dashboard-main-col'>
            {/* Stat cards */}
            <div className='stats-row'>
              <div className='stat-card pending'>
                <div className='stat-icon-wrapper'>
                  <ClockIcon />
                </div>
                <div className='stat-info'>
                  <span className='stat-count'>{pendingCount}</span>
                  <span className='stat-label'>Pending Approval</span>
                </div>
              </div>
              <div className='stat-card approved'>
                <div className='stat-icon-wrapper'>
                  <CheckIcon />
                </div>
                <div className='stat-info'>
                  <span className='stat-count'>{approvedCount}</span>
                  <span className='stat-label'>Approved Requests</span>
                </div>
              </div>
              <div className='stat-card fulfilled'>
                <div className='stat-icon-wrapper'>
                  <ShippingIcon />
                </div>
                <div className='stat-info'>
                  <span className='stat-count'>{fulfilledCount}</span>
                  <span className='stat-label'>Fulfilled Items</span>
                </div>
              </div>
            </div>

            {/* Recent Requests Table */}
            <div className='dashboard-panel'>
              <div className='panel-header'>
                <h2>Recent Request Submissions</h2>
                <button className='panel-header-link' onClick={() => setTab('requests')}>
                  View All Requests
                </button>
              </div>
              <div className='panel-body'>
                {requestsLoading ? (
                  <div className='loading-spinner-box'>Loading request history...</div>
                ) : requests.length === 0 ? (
                  <div className='empty-state'>
                    <p className='empty-text'>No requests submitted yet.</p>
                    <button className='empty-action-btn' onClick={() => setTab('catalog')}>
                      Browse Catalog to Place Request
                    </button>
                  </div>
                ) : (
                  <div className='table-responsive'>
                    <table className='user-styled-table'>
                      <thead>
                        <tr>
                          <th>Request #</th>
                          <th>Submission Date</th>
                          <th>Items Requested</th>
                          <th>Fulfillment Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.slice(0, 3).map((req) => {
                          const totalItems = req.items
                            ? req.items.reduce((sum, i) => sum + i.quantity_requested, 0)
                            : 0;
                          return (
                            <tr key={req.id}>
                              <td className='font-mono font-bold'>{req.request_number}</td>
                              <td>{formatDate(req.created_at)}</td>
                              <td>
                                {totalItems} items ({req.items?.length || 0} unique)
                              </td>
                              <td>
                                <span className={`status-badge ${req.status}`}>{req.status}</span>
                              </td>
                              <td>
                                <button
                                  className='table-action-btn'
                                  onClick={() => openDetailsModal(req)}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: QUICK BROWSE CATEGORIES */}
          <div className='dashboard-side-col'>
            <div className='dashboard-panel'>
              <div className='panel-header'>
                <h2>Quick Browse</h2>
              </div>
              <div className='panel-body'>
                <p className='side-panel-intro'>
                  Jump directly into a category section in the catalog:
                </p>
                {catalogLoading ? (
                  <div className='loading-spinner-box'>Loading categories...</div>
                ) : getCategories().length === 0 ? (
                  <div className='empty-categories'>No categories available in the inventory.</div>
                ) : (
                  <div className='category-cards-grid'>
                    {getCategories()
                      .slice(0, 6)
                      .map((cat) => (
                        <div
                          key={cat.name}
                          className='category-quick-card'
                          onClick={() => {
                            setTab('catalog');
                            setSearchParams({ tab: 'catalog', category: cat.name });
                          }}
                        >
                          <div className='cat-icon-container'>
                            <FolderIcon className='cat-icon' />
                          </div>
                          <div className='cat-details'>
                            <span className='cat-name'>{cat.name}</span>
                            <span className='cat-count'>{cat.count} products</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CATALOG BROWSER & CART SECTION */}
      {activeTab === 'catalog' && (
        <div className='catalog-layout-grid'>
          {/* Catalog products search, filter, and table */}
          <div className='catalog-products-section'>
            <div className='catalog-filters-bar'>
              <div className='search-input-wrapper'>
                <SearchIcon className='search-bar-icon' />
                <input
                  type='text'
                  placeholder='Search catalog by product name or SKU...'
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
              <select
                className='category-dropdown-filter'
                value={catalogCategory}
                onChange={(e) => setCatalogCategory(e.target.value)}
              >
                <option value=''>All Product Categories</option>
                {getCategories().map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='dashboard-panel no-margin'>
              <div className='panel-header'>
                <h2>Available Inventory Products</h2>
                <span className='results-count-badge'>
                  Showing {filteredCatalog.length} of {catalog.length} items
                </span>
              </div>
              <div className='panel-body pad-none'>
                {catalogLoading ? (
                  <div className='loading-spinner-box padding-lg'>Loading catalog products...</div>
                ) : catalogError ? (
                  <div className='error-state'>{catalogError}</div>
                ) : filteredCatalog.length === 0 ? (
                  <div className='empty-state padding-lg'>
                    No items found matching your filters.
                  </div>
                ) : (
                  <div className='table-responsive'>
                    <table className='user-styled-table font-sm'>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product Name</th>
                          <th>Category</th>
                          <th>Unit</th>
                          <th>Stock Status</th>
                          <th className='align-center'>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCatalog.map((prod) => (
                          <tr key={prod.id}>
                            <td className='font-mono font-bold color-muted'>{prod.sku}</td>
                            <td>
                              <div className='product-table-cell'>
                                <span className='product-cell-name'>{prod.name}</span>
                                {prod.description && (
                                  <span className='product-cell-desc'>{prod.description}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className='category-inline-tag'>{prod.category || 'N/A'}</span>
                            </td>
                            <td className='color-muted'>{prod.unit || 'unit'}</td>
                            <td>
                              <span
                                className={`status-badge availability ${prod.availability_status}`}
                              >
                                {prod.availability_status === 'in_stock' && 'In Stock'}
                                {prod.availability_status === 'low_stock' && 'Low Stock'}
                                {prod.availability_status === 'out_of_stock' && 'Out Of Stock'}
                              </span>
                            </td>
                            <td className='align-center'>
                              <button
                                className='add-to-cart-btn'
                                onClick={() => addToCart(prod)}
                                disabled={prod.availability_status === 'out_of_stock'}
                              >
                                <CartIcon className='btn-cart-icon' />
                                <span>Add to Cart</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* REQUEST CART SIDEBAR */}
          <div className='catalog-cart-sidebar'>
            <div className='cart-sticky-container'>
              <div className='dashboard-panel no-margin height-full flex-column'>
                <div className='panel-header'>
                  <div className='cart-header-title'>
                    <CartIcon className='cart-header-icon' />
                    <h2>Request Cart</h2>
                  </div>
                  <span className='cart-item-count-indicator'>
                    {Object.keys(cart).length} unique items
                  </span>
                </div>

                <div className='cart-content-wrapper flex-grow'>
                  {Object.keys(cart).length === 0 ? (
                    <div className='empty-cart-state'>
                      <CartIcon className='empty-cart-icon' />
                      <p>Your request cart is currently empty.</p>
                      <span>
                        Select products from the catalog table to add them to your request.
                      </span>
                    </div>
                  ) : (
                    <div className='cart-items-list'>
                      {Object.values(cart).map((item) => (
                        <div key={item.product.id} className='cart-item-row'>
                          <div className='cart-item-details'>
                            <span className='cart-item-name'>{item.product.name}</span>
                            <span className='cart-item-sku font-mono'>{item.product.sku}</span>
                          </div>
                          <div className='cart-item-actions'>
                            <div className='quantity-adjuster-box'>
                              <button
                                className='qty-adj-btn'
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                                type='button'
                              >
                                <RemoveIcon />
                              </button>
                              <span className='qty-display'>{item.quantity}</span>
                              <button
                                className='qty-adj-btn'
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                type='button'
                              >
                                <AddIcon />
                              </button>
                            </div>
                            <button
                              className='cart-delete-item-btn'
                              onClick={() => removeFromCart(item.product.id)}
                              type='button'
                              title='Remove item'
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {Object.keys(cart).length > 0 && (
                  <form className='cart-submission-form' onSubmit={handleSubmitRequest}>
                    <div className='form-group-item'>
                      <label htmlFor='department'>
                        <DeptIcon className='form-label-icon' />
                        <span>Department / Cost Center</span>
                      </label>
                      <input
                        id='department'
                        type='text'
                        placeholder='e.g. Sales, Quality Assurance, IT'
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        required
                      />
                    </div>
                    <div className='form-group-item'>
                      <label htmlFor='purpose'>
                        <MsgIcon className='form-label-icon' />
                        <span>Purpose of Request *</span>
                      </label>
                      <textarea
                        id='purpose'
                        rows='3'
                        placeholder='Detail why these materials are required...'
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <button className='submit-request-btn' type='submit' disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting request...' : 'Submit Request Order'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MY REQUESTS HISTORY TAB */}
      {activeTab === 'requests' && (
        <div className='dashboard-panel no-margin'>
          <div className='panel-header'>
            <h2>Your Request Submissions</h2>
            <span className='results-count-badge'>Total: {requests.length} requests</span>
          </div>
          <div className='panel-body pad-none'>
            {requestsLoading ? (
              <div className='loading-spinner-box padding-lg'>Loading request history...</div>
            ) : requestsError ? (
              <div className='error-state'>{requestsError}</div>
            ) : requests.length === 0 ? (
              <div className='empty-state padding-lg'>
                <p className='empty-text'>You have not submitted any item requests yet.</p>
                <button className='empty-action-btn' onClick={() => setTab('catalog')}>
                  Go to Catalog to Submit First Request
                </button>
              </div>
            ) : (
              <div className='table-responsive'>
                <table className='user-styled-table'>
                  <thead>
                    <tr>
                      <th>Request Number</th>
                      <th>Department</th>
                      <th>Purpose</th>
                      <th>Submission Date</th>
                      <th>Items Requested</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => {
                      const totalItems = req.items
                        ? req.items.reduce((sum, i) => sum + i.quantity_requested, 0)
                        : 0;
                      return (
                        <tr key={req.id}>
                          <td className='font-mono font-bold color-indigo'>{req.request_number}</td>
                          <td>{req.department || 'N/A'}</td>
                          <td className='max-width-text-cell' title={req.purpose}>
                            {req.purpose}
                          </td>
                          <td>{formatDate(req.created_at)}</td>
                          <td>
                            {totalItems} items ({req.items?.length || 0} unique)
                          </td>
                          <td>
                            <span className={`status-badge ${req.status}`}>{req.status}</span>
                          </td>
                          <td>
                            <div className='table-multi-actions'>
                              <button
                                className='table-action-btn outline'
                                onClick={() => openDetailsModal(req)}
                              >
                                View Details
                              </button>
                              {req.status === 'pending' && (
                                <button
                                  className='table-action-btn cancel-btn'
                                  onClick={() => handleCancelRequest(req.id, req.request_number)}
                                  disabled={isSubmitting}
                                >
                                  Cancel
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
          </div>
        </div>
      )}

      {/* 4. DETAILS MODAL */}
      {isDetailsModalOpen && selectedRequest && (
        <div className='details-modal-overlay'>
          <div className='details-modal-box'>
            {/* Modal Header */}
            <div className='modal-header-section'>
              <div className='modal-title-left'>
                <span className='modal-req-number'>{selectedRequest.request_number}</span>
                <span className={`status-badge ${selectedRequest.status}`}>
                  {selectedRequest.status}
                </span>
              </div>
              <button
                className='modal-close-btn'
                onClick={() => setIsDetailsModalOpen(false)}
                aria-label='Close'
              >
                <CloseIcon />
              </button>
            </div>

            {/* Modal Content */}
            <div className='modal-body-section'>
              {/* Request Metadata info card */}
              <div className='modal-info-grid'>
                <div className='info-group'>
                  <span className='info-lbl'>Submission Date & Time</span>
                  <span className='info-val'>{formatDate(selectedRequest.created_at)}</span>
                </div>
                <div className='info-group'>
                  <span className='info-lbl'>Department / Cost Center</span>
                  <span className='info-val'>{selectedRequest.department || 'N/A'}</span>
                </div>
                <div className='info-group col-span-2'>
                  <span className='info-lbl'>Request Purpose Description</span>
                  <span className='info-val purpose-block'>{selectedRequest.purpose}</span>
                </div>
              </div>

              {/* Review details if not pending/cancelled */}
              {['approved', 'rejected', 'fulfilled'].includes(selectedRequest.status) && (
                <div className={`modal-review-panel ${selectedRequest.status}`}>
                  <h3 className='review-title'>Review & Log Comments</h3>
                  <div className='review-meta-row'>
                    <span>
                      <strong>Action Timestamp:</strong>{' '}
                      {formatDate(selectedRequest.reviewed_at || selectedRequest.fulfilled_at)}
                    </span>
                  </div>
                  {selectedRequest.review_notes && (
                    <div className='review-notes-container'>
                      <strong>Approver Explanatory Notes:</strong>
                      <p>{selectedRequest.review_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Itemized requested list */}
              <div className='modal-items-section'>
                <h3 className='section-title'>Requested Item Details</h3>
                <div className='table-responsive'>
                  <table className='modal-styled-table'>
                    <thead>
                      <tr>
                        <th>Product SKU</th>
                        <th>Product Name</th>
                        <th className='align-center'>Quantity Requested</th>
                        <th className='align-center'>Quantity Fulfilled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items?.map((item) => (
                        <tr key={item.id}>
                          <td className='font-mono'>{item.product?.sku || 'N/A'}</td>
                          <td>
                            <strong>
                              {item.product?.name || `Product ID: ${item.product_id}`}
                            </strong>
                          </td>
                          <td className='align-center font-bold'>{item.quantity_requested}</td>
                          <td className='align-center font-bold text-success'>
                            {selectedRequest.status === 'fulfilled'
                              ? item.quantity_fulfilled !== null
                                ? item.quantity_fulfilled
                                : item.quantity_requested
                              : item.quantity_fulfilled !== null
                                ? item.quantity_fulfilled
                                : 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className='modal-footer-section'>
              {selectedRequest.status === 'pending' && (
                <button
                  className='modal-action-btn cancel-btn'
                  onClick={() =>
                    handleCancelRequest(selectedRequest.id, selectedRequest.request_number)
                  }
                  disabled={isSubmitting}
                >
                  Cancel Request Order
                </button>
              )}
              <button
                className='modal-action-btn close-btn'
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
