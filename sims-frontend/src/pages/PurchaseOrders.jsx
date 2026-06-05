import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Eye, Plus, Check, Truck, X, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import api from '../services/api';
import '../styles/PurchaseOrders.css';

export default function PurchaseOrders() {
  const { user } = useSelector(state => state.auth);
  const { showToast } = useToast();
  
  // State management
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_delivery: '',
    notes: '',
    items: []
  });
  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: '',
    unit_price: ''
  });
  const [receiveData, setReceiveData] = useState({
    warehouse_id: '',
    received_items: []
  });

  // Fetch purchase orders
  const fetchPOs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (selectedStatus !== 'all') params.status = selectedStatus;
      const response = await api.get('/purchase-orders', { params });
      setPos(response.data.orders || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      showToast('Failed to load purchase orders', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, showToast]);

  // Fetch supporting data
  const fetchData = useCallback(async () => {
    try {
      const [suppRes, prodRes, wareRes] = await Promise.all([
        api.get('/suppliers?limit=500'),
        api.get('/products?limit=500'),
        api.get('/warehouses?limit=500')
      ]);
      
      setSuppliers(suppRes.data.suppliers || suppRes.data);
      setProducts(prodRes.data.products || prodRes.data);
      setWarehouses(wareRes.data.warehouses || wareRes.data);
    } catch (error) {
      showToast('Failed to load data', 'error');
      console.error(error);
    }
  }, [showToast]);

  // Load data on mount
  useEffect(() => {
    fetchData();
    fetchPOs();
  }, [fetchData, fetchPOs]);

  // Calculate total amount
  const totalAmount = formData.items.reduce((sum, item) => 
    sum + (parseFloat(item.quantity) * parseFloat(item.unit_price) || 0), 0
  );

  // Handle add item
  const handleAddItem = () => {
    if (!newItem.product_id || !newItem.quantity || !newItem.unit_price) {
      showToast('Please fill all item fields', 'error');
      return;
    }
    const product = products.find(p => p.product_id == newItem.product_id);
    if (!product) {
      showToast('Product not found', 'error');
      return;
    }
    const item = {
      product_id: newItem.product_id,
      product_name: product.name,
      quantity: parseFloat(newItem.quantity),
      unit_price: parseFloat(newItem.unit_price)
    };
    setFormData({
      ...formData,
      items: [...formData.items, item]
    });
    setNewItem({ product_id: '', quantity: '', unit_price: '' });
    showToast('Item added', 'success');
  };

  // Handle remove item
  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  // Handle create PO
  const handleCreatePO = async () => {
    if (!formData.supplier_id || !formData.expected_delivery || formData.items.length === 0) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    try {
      const response = await api.post('/purchase-orders', formData);
      setPos([response.data.po || response.data, ...pos]);
      setShowCreateModal(false);
      setFormData({ supplier_id: '', expected_delivery: '', notes: '', items: [] });
      setCreateStep(1);
      showToast('Purchase order created', 'success');
      fetchPOs();
    } catch (error) {
      showToast('Failed to create PO', 'error');
      console.error(error);
    }
  };

  // Handle approve PO
  const handleApprovePO = async (poId) => {
    try {
      const response = await api.patch(`/purchase-orders/${poId}/approve`);
      setPos(pos.map(p => p.purchase_order_id === poId ? response.data.po || response.data : p));
      showToast('PO approved', 'success');
    } catch (error) {
      showToast('Failed to approve PO', 'error');
      console.error(error);
    }
  };

  // Handle receive PO
  const handleReceiveGoods = async () => {
    if (!receiveData.warehouse_id || !receiveData.received_items.length) {
      showToast('Please select warehouse and items', 'error');
      return;
    }
    try {
      const response = await api.post(`/purchase-orders/${selectedPO.purchase_order_id}/receive`, receiveData);
      setPos(pos.map(p => p.purchase_order_id === selectedPO.purchase_order_id ? response.data.po || response.data : p));
      setShowReceiveModal(false);
      setReceiveData({ warehouse_id: '', received_items: [] });
      showToast('Goods received', 'success');
    } catch (error) {
      showToast('Failed to receive goods', 'error');
      console.error(error);
    }
  };

  // Handle cancel PO
  const handleCancelPO = async (poId) => {
    try {
      const response = await api.patch(`/purchase-orders/${poId}/cancel`);
      setPos(pos.map(p => p.purchase_order_id === poId ? response.data.po || response.data : p));
      showToast('PO cancelled', 'success');
    } catch (error) {
      showToast('Failed to cancel PO', 'error');
      console.error(error);
    }
  };

  // Handle open receive modal
  const handleOpenReceiveModal = (po) => {
    setSelectedPO(po);
    let items = po.items;
    if (typeof items === 'string') items = JSON.parse(items);
    setReceiveData({
      warehouse_id: '',
      received_items: (items || []).map(item => ({
        product_id: item.product_id,
        quantity_received: 0
      }))
    });
    setShowReceiveModal(true);
  };

  if (loading) return <div className="po-container"><p>Loading...</p></div>;

  return (
    <div className="po-container">
      <div className="po-header">
        <h1>Purchase Orders</h1>
        {['admin', 'manager'].includes(user?.role) && (
          <button className="btn-primary" onClick={() => {
            setFormData({ supplier_id: '', expected_delivery: '', notes: '', items: [] });
            setCreateStep(1);
            setShowCreateModal(true);
          }}>
            <Plus size={20} /> New PO
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="status-tabs">
        {['all', 'pending', 'approved', 'received', 'cancelled'].map(status => (
          <button
            key={status}
            className={`tab ${selectedStatus === status ? 'active' : ''}`}
            onClick={() => {
              setSelectedStatus(status);
              setPage(1);
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="table-wrapper">
        <table className="po-table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Order Date</th>
              <th>Expected Delivery</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pos.length > 0 ? pos.map(po => (
              <tr key={po.purchase_order_id}>
                <td><span className="po-number">{po.po_number}</span></td>
                <td>{po.Supplier?.name || 'N/A'}</td>
                <td>{new Date(po.order_date).toLocaleDateString()}</td>
                <td>{new Date(po.expected_delivery).toLocaleDateString()}</td>
                <td>{Array.isArray(po.items) ? po.items.length : 0}</td>
                <td><span className="amount">${parseFloat(po.total_amount).toFixed(2)}</span></td>
                <td>
                  <span className={`status-badge status-${po.status}`}>
                    {po.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-btn view"
                      onClick={() => {
                        setSelectedPO(po);
                        setShowDetailModal(true);
                      }}
                      title="View details"
                    >
                      <Eye size={18} />
                    </button>
                    {po.status === 'pending' && ['admin', 'manager'].includes(user?.role) && (
                      <button
                        className="action-btn approve"
                        onClick={() => handleApprovePO(po.purchase_order_id)}
                        title="Approve"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    {po.status === 'approved' && ['admin', 'manager'].includes(user?.role) && (
                      <button
                        className="action-btn receive"
                        onClick={() => handleOpenReceiveModal(po)}
                        title="Receive"
                      >
                        <Truck size={18} />
                      </button>
                    )}
                    {['pending', 'approved'].includes(po.status) && user?.role === 'admin' && (
                      <button
                        className="action-btn cancel"
                        onClick={() => handleCancelPO(po.purchase_order_id)}
                        title="Cancel"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No purchase orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setCreateStep(1);
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Purchase Order - Step {createStep}/3</h2>
              <button className="close-btn" onClick={() => {
                setShowCreateModal(false);
                setCreateStep(1);
              }}>✕</button>
            </div>
            <div className="modal-body">
              {createStep === 1 && (
                <div>
                  <div className="form-group">
                    <label>Supplier *</label>
                    <select
                      value={formData.supplier_id}
                      onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Choose...</option>
                      {suppliers.map(s => (
                        <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Expected Delivery *</label>
                    <input
                      type="date"
                      value={formData.expected_delivery}
                      onChange={e => setFormData({ ...formData, expected_delivery: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="form-input"
                      rows="3"
                    />
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Product *</label>
                      <select
                        value={newItem.product_id}
                        onChange={e => {
                          const p = products.find(x => x.product_id == e.target.value);
                          setNewItem({ ...newItem, product_id: e.target.value, unit_price: p?.unit_price || '' });
                        }}
                        className="form-input"
                      >
                        <option value="">Choose...</option>
                        {products.map(p => (
                          <option key={p.product_id} value={p.product_id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        value={newItem.quantity}
                        onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                        placeholder="Qty"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit Price *</label>
                      <input
                        type="number"
                        value={newItem.unit_price}
                        onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })}
                        placeholder="Price"
                        className="form-input"
                      />
                    </div>
                  </div>
                  <button className="btn-primary" onClick={handleAddItem}>
                    <Plus size={18} /> Add
                  </button>

                  {formData.items.length > 0 && (
                    <table className="items-table" style={{ marginTop: '1rem' }}>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Subtotal</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>${item.unit_price.toFixed(2)}</td>
                            <td>${(item.quantity * item.unit_price).toFixed(2)}</td>
                            <td>
                              <button
                                className="remove-btn"
                                onClick={() => handleRemoveItem(idx)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
                    Total: ${totalAmount.toFixed(2)}
                  </p>
                </div>
              )}

              {createStep === 3 && (
                <div style={{ lineHeight: '1.8' }}>
                  <p><strong>Supplier:</strong> {suppliers.find(s => s.supplier_id == formData.supplier_id)?.name}</p>
                  <p><strong>Delivery:</strong> {new Date(formData.expected_delivery).toLocaleDateString()}</p>
                  <p><strong>Items:</strong> {formData.items.length}</p>
                  <p><strong>Total:</strong> ${totalAmount.toFixed(2)}</p>
                  {formData.notes && <p><strong>Notes:</strong> {formData.notes}</p>}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {createStep > 1 && (
                <button className="btn-secondary" onClick={() => setCreateStep(createStep - 1)}>
                  Back
                </button>
              )}
              {createStep < 3 && (
                <button className="btn-primary" onClick={() => setCreateStep(createStep + 1)}>
                  Next
                </button>
              )}
              {createStep === 3 && (
                <button className="btn-primary" onClick={handleCreatePO}>
                  <Check size={18} /> Create
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && selectedPO && (
        <div className="modal-overlay" onClick={() => setShowReceiveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Receive - {selectedPO.po_number}</h2>
              <button className="close-btn" onClick={() => setShowReceiveModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Warehouse *</label>
                <select
                  value={receiveData.warehouse_id}
                  onChange={e => setReceiveData({ ...receiveData, warehouse_id: e.target.value })}
                  className="form-input"
                >
                  <option value="">Choose...</option>
                  {warehouses.map(w => (
                    <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Ordered</th>
                    <th>Receive</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveData.received_items.map((item, idx) => {
                    const p = products.find(x => x.product_id === item.product_id);
                    const poItem = Array.isArray(selectedPO.items) ? selectedPO.items[idx] : null;
                    return (
                      <tr key={idx}>
                        <td>{p?.name || 'N/A'}</td>
                        <td>{poItem?.quantity || 0}</td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity_received}
                            onChange={e => {
                              const ni = [...receiveData.received_items];
                              ni[idx].quantity_received = parseInt(e.target.value) || 0;
                              setReceiveData({ ...receiveData, received_items: ni });
                            }}
                            className="form-input"
                            style={{ width: '80px' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowReceiveModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleReceiveGoods}>
                <Truck size={18} /> Receive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPO && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPO.po_number}</h2>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Supplier:</strong> {selectedPO.Supplier?.name}</p>
              <p><strong>Status:</strong> <span className={`status-badge status-${selectedPO.status}`}>{selectedPO.status}</span></p>
              <p><strong>Order Date:</strong> {new Date(selectedPO.created_at).toLocaleDateString()}</p>
              <p><strong>Expected Delivery:</strong> {new Date(selectedPO.expected_delivery).toLocaleDateString()}</p>

              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(selectedPO.items) && selectedPO.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>${item.unit_price?.toFixed(2)}</td>
                      <td>${(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
                Total: ${selectedPO.total_amount?.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
