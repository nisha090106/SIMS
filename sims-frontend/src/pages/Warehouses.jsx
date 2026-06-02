import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import Toast from '../components/Toast';
import '../styles/Warehouses.css';

const Warehouses = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [warehouses, setWarehouses] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [detailData, setDetailData] = useState(null);

  // Fetch warehouses
  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data.data);
    } catch (error) {
      showToast('Failed to load warehouses', 'error');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch managers for dropdown
  const fetchManagers = useCallback(async () => {
    try {
      const res = await api.get('/warehouses/managers');
      setManagers(res.data.data);
    } catch (error) {
      console.error('Fetch managers error:', error);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
    fetchManagers();
  }, [fetchWarehouses, fetchManagers]);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Validation schema
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Warehouse name is required').min(2, 'Name must be at least 2 characters'),
    location: Yup.string().required('Location is required').min(2, 'Location must be at least 2 characters'),
    address: Yup.string().min(5, 'Address must be at least 5 characters'),
    capacity: Yup.number().required('Capacity is required').positive('Capacity must be greater than 0'),
    manager_id: Yup.number().required('Manager is required').positive('Please select a valid manager'),
  });

  // Formik for add/edit warehouse
  const formik = useFormik({
    initialValues: {
      name: selectedWarehouse?.name || '',
      location: selectedWarehouse?.location || '',
      address: selectedWarehouse?.address || '',
      capacity: selectedWarehouse?.capacity || '',
      manager_id: selectedWarehouse?.manager_id || '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        if (isEditModalOpen && selectedWarehouse) {
          await api.put(`/warehouses/${selectedWarehouse.warehouse_id}`, values);
          showToast('Warehouse updated successfully');
        } else {
          await api.post('/warehouses', values);
          showToast('Warehouse created successfully');
        }
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedWarehouse(null);
        fetchWarehouses();
      } catch (error) {
        const errorMsg = error.response?.data?.error || 'Failed to save warehouse';
        showToast(errorMsg, 'error');
      }
    },
  });

  // View warehouse details
  const handleViewDetails = async (warehouse) => {
    try {
      const res = await api.get(`/warehouses/${warehouse.warehouse_id}`);
      setDetailData(res.data.data);
      setIsDetailModalOpen(true);
    } catch (error) {
      showToast('Failed to load warehouse details', 'error');
    }
  };

  // Edit warehouse
  const handleEditWarehouse = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsEditModalOpen(true);
  };

  // Delete warehouse
  const handleDeleteWarehouse = async (warehouseId) => {
    try {
      await api.delete(`/warehouses/${warehouseId}`);
      showToast('Warehouse deleted successfully');
      fetchWarehouses();
      setDeleteConfirm(null);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete warehouse';
      showToast(errorMsg, 'error');
      setDeleteConfirm(null);
    }
  };

  // Get utilization color
  const getUtilizationColor = (percent) => {
    if (percent >= 85) return '#ef4444';
    if (percent >= 60) return '#eab308';
    return '#22c55e';
  };

  // Close modals
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedWarehouse(null);
    formik.resetForm();
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedWarehouse(null);
    formik.resetForm();
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailData(null);
  };

  if (loading && warehouses.length === 0) {
    return <div className="loading">Loading warehouses...</div>;
  }

  return (
    <div className="warehouses-container">
      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage} type={toastType} />}

      {/* Header */}
      <div className="warehouses-header">
        <h1>Warehouses</h1>
        {isAdmin && (
          <button
            className="btn-primary"
            onClick={() => {
              setSelectedWarehouse(null);
              formik.resetForm();
              setIsAddModalOpen(true);
            }}
          >
            + Add Warehouse
          </button>
        )}
      </div>

      {/* Warehouses Grid */}
      <div className="warehouses-grid">
        {warehouses.length === 0 ? (
          <div className="empty-state">
            <p>No warehouses found</p>
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <div key={warehouse.warehouse_id} className="warehouse-card">
              {/* Card Header */}
              <div className="card-header">
                <h3>{warehouse.name}</h3>
                <span className="location-badge">{warehouse.location}</span>
              </div>

              {/* Capacity Bar */}
              <div className="capacity-section">
                <div className="capacity-info">
                  <span className="capacity-label">Capacity Utilization</span>
                  <span className="capacity-percent">
                    {warehouse.utilization_percent?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="capacity-bar-container">
                  <div
                    className="capacity-bar"
                    style={{
                      width: `${Math.min(warehouse.utilization_percent || 0, 100)}%`,
                      backgroundColor: getUtilizationColor(warehouse.utilization_percent || 0),
                    }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="stats">
                <div className="stat-item">
                  <span className="stat-label">Total Capacity</span>
                  <span className="stat-value">{Math.round(warehouse.capacity)} units</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Available Space</span>
                  <span className="stat-value">
                    {Math.round(warehouse.capacity - warehouse.current_usage)} units
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Manager</span>
                  <span className="stat-value">{warehouse.manager_name || 'Unassigned'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="card-actions">
                <button
                  className="btn-view"
                  onClick={() => handleViewDetails(warehouse)}
                >
                  View Details
                </button>
                {isManagerOrAdmin && (
                  <div className="action-icons">
                    <button
                      className="icon-btn edit"
                      onClick={() => handleEditWarehouse(warehouse)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    {isAdmin && (
                      <button
                        className="icon-btn delete"
                        onClick={() => setDeleteConfirm(warehouse)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && detailData && (
        <div className="modal-overlay" onClick={handleCloseDetailModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{detailData.name}</h2>
              <button className="close-btn" onClick={handleCloseDetailModal}>✕</button>
            </div>

            <div className="modal-body">
              {/* Radial Chart */}
              <div className="detail-section">
                <h4>Utilization Gauge</h4>
                <div className="gauge-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="90%"
                      data={[
                        {
                          name: 'Utilization',
                          value: detailData.utilization_percent || 0,
                          fill: getUtilizationColor(detailData.utilization_percent || 0),
                        },
                      ]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                      />
                      <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={10}
                        label={{ position: 'center', value: `${(detailData.utilization_percent || 0).toFixed(1)}%` }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Warehouse Info */}
              <div className="detail-section">
                <h4>Warehouse Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Location:</span>
                    <span className="value">{detailData.location}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Address:</span>
                    <span className="value">{detailData.address || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Manager:</span>
                    <span className="value">{detailData.manager_name || 'Unassigned'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Total Capacity:</span>
                    <span className="value">{Math.round(detailData.capacity)} units</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Current Usage:</span>
                    <span className="value">{Math.round(detailData.current_usage)} units</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Available Space:</span>
                    <span className="value">{Math.round(detailData.capacity - detailData.current_usage)} units</span>
                  </div>
                </div>
              </div>

              {/* Top Products */}
              {detailData.top_products && detailData.top_products.length > 0 && (
                <div className="detail-section">
                  <h4>Top Products</h4>
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.top_products.map((product, idx) => (
                        <tr key={idx}>
                          <td>{product.product_name}</td>
                          <td>{product.sku}</td>
                          <td>{product.quantity}</td>
                          <td>{product.location || '-'}</td>
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
      {(isAddModalOpen || isEditModalOpen) && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (isEditModalOpen) handleCloseEditModal();
            else handleCloseAddModal();
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditModalOpen ? 'Edit Warehouse' : 'Add New Warehouse'}</h2>
              <button
                className="close-btn"
                onClick={() => {
                  if (isEditModalOpen) handleCloseEditModal();
                  else handleCloseAddModal();
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={formik.handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Warehouse Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter warehouse name"
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
                  <label htmlFor="location">Location *</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    placeholder="e.g., New York"
                    value={formik.values.location}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={formik.touched.location && formik.errors.location ? 'input-error' : ''}
                  />
                  {formik.touched.location && formik.errors.location && (
                    <span className="error-text">{formik.errors.location}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="capacity">Capacity (units) *</label>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    placeholder="e.g., 10000"
                    value={formik.values.capacity}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={formik.touched.capacity && formik.errors.capacity ? 'input-error' : ''}
                  />
                  {formik.touched.capacity && formik.errors.capacity && (
                    <span className="error-text">{formik.errors.capacity}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Full Address</label>
                <textarea
                  id="address"
                  name="address"
                  placeholder="Enter full warehouse address"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  rows="3"
                  className={formik.touched.address && formik.errors.address ? 'input-error' : ''}
                />
                {formik.touched.address && formik.errors.address && (
                  <span className="error-text">{formik.errors.address}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="manager_id">Manager *</label>
                <select
                  id="manager_id"
                  name="manager_id"
                  value={formik.values.manager_id}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={formik.touched.manager_id && formik.errors.manager_id ? 'input-error' : ''}
                >
                  <option value="">Select a manager</option>
                  {managers.map((manager) => (
                    <option key={manager.user_id} value={manager.user_id}>
                      {manager.full_name} ({manager.role})
                    </option>
                  ))}
                </select>
                {formik.touched.manager_id && formik.errors.manager_id && (
                  <span className="error-text">{formik.errors.manager_id}</span>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    if (isEditModalOpen) handleCloseEditModal();
                    else handleCloseAddModal();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formik.isSubmitting}>
                  {isEditModalOpen ? 'Update Warehouse' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Warehouse?</h3>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>

            <div className="modal-body">
              {deleteConfirm.current_usage > 0 ? (
                <div className="warning-message">
                  ⚠️ This warehouse contains stock. Please transfer all items before deleting.
                </div>
              ) : (
                <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              {deleteConfirm.current_usage === 0 && (
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteWarehouse(deleteConfirm.warehouse_id)}
                >
                  Delete Warehouse
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
