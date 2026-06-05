import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Star, Trash2, Edit2, Eye } from 'lucide-react';
import api from '../services/api';
import Toast from '../components/Toast';
import '../styles/Suppliers.css';

const Suppliers = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  // State
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [detailData, setDetailData] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      });
      setSuppliers(res.data.data.suppliers);
      setTotalPages(res.data.data.totalPages);
    } catch (error) {
      showToast('Failed to load suppliers', 'error');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Validation schema
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Supplier name is required').min(2, 'Name must be at least 2 characters'),
    contact_person: Yup.string().min(2, 'Contact person must be at least 2 characters'),
    email: Yup.string().email('Invalid email'),
    phone: Yup.string(),
    address: Yup.string(),
    payment_terms: Yup.string(),
    lead_time: Yup.number().min(0, 'Lead time must be positive'),
    rating: Yup.number().min(0, 'Rating must be 0 or higher').max(5, 'Rating must be 5 or less'),
  });

  // Formik
  const formik = useFormik({
    initialValues: {
      name: selectedSupplier?.name || '',
      contact_person: selectedSupplier?.contact_person || '',
      email: selectedSupplier?.email || '',
      phone: selectedSupplier?.phone || '',
      address: selectedSupplier?.address || '',
      payment_terms: selectedSupplier?.payment_terms || '',
      lead_time: selectedSupplier?.lead_time || '',
      rating: selectedSupplier?.rating || '',
      status: selectedSupplier?.status || 'active',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        if (isEditMode && selectedSupplier) {
          await api.put(`/suppliers/${selectedSupplier.supplier_id}`, values);
          showToast('Supplier updated successfully');
        } else {
          await api.post('/suppliers', values);
          showToast('Supplier created successfully');
        }
        setIsModalOpen(false);
        setIsEditMode(false);
        setSelectedSupplier(null);
        fetchSuppliers();
      } catch (error) {
        const errorMsg = error.response?.data?.error || 'Failed to save supplier';
        showToast(errorMsg, 'error');
      }
    },
  });

  // View supplier details
  const handleViewDetails = async (supplier) => {
    try {
      const res = await api.get(`/suppliers/${supplier.supplier_id}`);
      setDetailData(res.data.data);
      setIsDetailPanelOpen(true);
    } catch (error) {
      showToast('Failed to load supplier details', 'error');
    }
  };

  // Edit supplier
  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Delete supplier
  const handleDeleteSupplier = async (supplierId) => {
    try {
      await api.delete(`/suppliers/${supplierId}`);
      showToast('Supplier deleted successfully');
      fetchSuppliers();
      setDeleteConfirm(null);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete supplier';
      showToast(errorMsg, 'error');
      setDeleteConfirm(null);
    }
  };

  // Update rating
  const handleUpdateRating = async (supplierId, newRating) => {
    try {
      await api.patch(`/suppliers/${supplierId}/rating`, { rating: newRating });
      showToast('Rating updated successfully');
      fetchSuppliers();
      if (detailData?.supplier_id === supplierId) {
        setDetailData({ ...detailData, rating: newRating });
      }
    } catch (error) {
      showToast('Failed to update rating', 'error');
    }
  };

  // Close modals
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setSelectedSupplier(null);
    formik.resetForm();
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setDetailData(null);
  };

  // Render stars
  const renderStars = (rating, editable = false, supplierId = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          onClick={() => editable && handleUpdateRating(supplierId, i)}
          className={`star ${i <= Math.round(rating) ? 'filled' : 'empty'} ${editable ? 'editable' : ''}`}
        >
          <Star size={16} />
        </span>
      );
    }
    return stars;
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  if (loading && suppliers.length === 0) {
    return <div className="loading">Loading suppliers...</div>;
  }

  return (
    <div className="suppliers-container">
      {/* Toast */}
      {toastMessage && <Toast message={toastMessage} type={toastType} />}

      {/* Header */}
      <div className="suppliers-header">
        <h1>Suppliers</h1>
        {isManagerOrAdmin && (
          <button
            className="btn-primary"
            onClick={() => {
              setSelectedSupplier(null);
              setIsEditMode(false);
              formik.resetForm();
              setIsModalOpen(true);
            }}
          >
            + Add Supplier
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="suppliers-filters">
        <input
          type="text"
          placeholder="Search by name, email, or contact person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="status-select"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="suppliers-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Supplier Name</th>
              <th>Contact Person</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Payment Terms</th>
              <th>Lead Time</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan="10" className="empty-message">No suppliers found</td>
              </tr>
            ) : (
              suppliers.map((supplier, idx) => (
                <tr key={supplier.supplier_id}>
                  <td>{(page - 1) * 10 + idx + 1}</td>
                  <td>
                    <button
                      className="supplier-name-link"
                      onClick={() => handleViewDetails(supplier)}
                    >
                      {supplier.name}
                    </button>
                  </td>
                  <td>{supplier.contact_person || '-'}</td>
                  <td>{supplier.email || '-'}</td>
                  <td>{supplier.phone || '-'}</td>
                  <td>{supplier.payment_terms || '-'}</td>
                  <td>{supplier.lead_time ? `${supplier.lead_time} days` : '-'}</td>
                  <td>
                    <div className="stars-display">
                      {renderStars(supplier.rating || 0)}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${supplier.status}`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn view"
                        onClick={() => handleViewDetails(supplier)}
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      {isManagerOrAdmin && (
                        <button
                          className="action-btn edit"
                          onClick={() => handleEditSupplier(supplier)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="action-btn delete"
                          onClick={() => setDeleteConfirm(supplier)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="pagination-btn"
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="pagination-btn"
        >
          Next
        </button>
      </div>

      {/* Detail Side Panel */}
      {isDetailPanelOpen && detailData && (
        <div className="detail-panel-overlay" onClick={handleCloseDetailPanel}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <h2>{detailData.name}</h2>
              <button className="close-btn" onClick={handleCloseDetailPanel}>✕</button>
            </div>

            <div className="detail-body">
              {/* Contact Info */}
              <div className="detail-section">
                <h4>Contact Information</h4>
                <div className="detail-item">
                  <label>Contact Person:</label>
                  <span>{detailData.contact_person || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Email:</label>
                  <span>{detailData.email || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Phone:</label>
                  <span>{detailData.phone || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Address:</label>
                  <span>{detailData.address || '-'}</span>
                </div>
              </div>

              {/* Terms */}
              <div className="detail-section">
                <h4>Terms & Conditions</h4>
                <div className="detail-item">
                  <label>Payment Terms:</label>
                  <span>{detailData.payment_terms || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Lead Time:</label>
                  <span>{detailData.lead_time ? `${detailData.lead_time} days` : '-'}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="detail-section">
                <h4>Supplier Rating</h4>
                <div className="detail-item">
                  <label>Rating:</label>
                  <div className="stars-editable">
                    {renderStars(detailData.rating || 0, isManagerOrAdmin, detailData.supplier_id)}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Total Orders:</label>
                  <span>{detailData.total_orders || 0}</span>
                </div>
              </div>

              {/* Last Orders */}
              {detailData.last_5_purchase_orders && detailData.last_5_purchase_orders.length > 0 && (
                <div className="detail-section">
                  <h4>Last 5 Purchase Orders</h4>
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>PO #</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.last_5_purchase_orders.map((po) => (
                        <tr key={po.po_id}>
                          <td>{po.po_number}</td>
                          <td>{new Date(po.order_date).toLocaleDateString()}</td>
                          <td>${parseFloat(po.total_amount).toFixed(2)}</td>
                          <td>
                            <span className={`status-badge status-${po.status}`}>
                              {po.status}
                            </span>
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
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditMode ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={formik.handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Supplier Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter supplier name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={formik.touched.name && formik.errors.name ? 'input-error' : ''}
                />
                {formik.touched.name && formik.errors.name && (
                  <span className="error-text">{formik.errors.name}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact_person">Contact Person</label>
                  <input
                    type="text"
                    id="contact_person"
                    name="contact_person"
                    placeholder="Enter contact person name"
                    value={formik.values.contact_person}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="Enter phone number"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter email address"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={formik.touched.email && formik.errors.email ? 'input-error' : ''}
                />
                {formik.touched.email && formik.errors.email && (
                  <span className="error-text">{formik.errors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  placeholder="Enter full address"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="payment_terms">Payment Terms</label>
                  <input
                    type="text"
                    id="payment_terms"
                    name="payment_terms"
                    placeholder="e.g., Net 30, Net 60"
                    value={formik.values.payment_terms}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lead_time">Lead Time (days)</label>
                  <input
                    type="number"
                    id="lead_time"
                    name="lead_time"
                    placeholder="e.g., 7"
                    value={formik.values.lead_time}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rating">Rating (1-5)</label>
                  <input
                    type="number"
                    id="rating"
                    name="rating"
                    placeholder="1-5"
                    value={formik.values.rating}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    min="0"
                    max="5"
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blacklisted">Blacklisted</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formik.isSubmitting}>
                  {isEditMode ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Supplier?</h3>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
              </p>
              {deleteConfirm.total_orders > 0 && (
                <div className="warning-message">
                  ⚠️ This supplier has {deleteConfirm.total_orders} purchase orders.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDeleteSupplier(deleteConfirm.supplier_id)}
              >
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
