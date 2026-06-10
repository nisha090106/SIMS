import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';
import '../styles/Inventory.css';

const Inventory = () => {
  const { user } = useSelector((state) => state.auth);
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dropdown data
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Modals state
  const [toastMessage, setToastMessage] = useState('');
  const [activeModal, setActiveModal] = useState(null); // 'update', 'transfer', 'adjust', null
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/inventory/summary');
      setSummary(res.data.data);
      // Extract warehouses from summary to populate filters
      setWarehouses(res.data.data.byWarehouse || []);
    } catch (err) {
      console.error('Failed to fetch summary', err);
    }
  };

  const fetchDropdownData = async () => {
    try {
      // Assuming GET /products returns { data: { products: [...] } } without pagination if we set high limit
      const prodRes = await api.get('/products?limit=1000');
      setProducts(prodRes.data.data.products || []);
      const whRes = await api.get('/warehouses');
      setWarehouses(whRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch dropdown data', err);
    }
  };

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch,
          warehouse_id: warehouseFilter,
          status: statusFilter,
        },
      });
      setInventory(res.data.data.inventory);
      setTotalPages(res.data.data.totalPages);
      setTotalItemsCount(res.data.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, warehouseFilter, statusFilter]);

  useEffect(() => {
    fetchSummary();
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const refreshAll = () => {
    fetchInventory();
    fetchSummary();
  };

  return (
    <div className='inventory-container'>
      {/* HEADER */}
      <div className='inventory-header'>
        <h1>Inventory</h1>
        {isManagerOrAdmin && (
          <div className='header-actions'>
            <button className='btn btn-secondary' onClick={() => setActiveModal('transfer')}>
              Transfer Stock
            </button>
            <button className='btn btn-primary' onClick={() => setActiveModal('adjust')}>
              Adjust Stock
            </button>
          </div>
        )}
      </div>

      {toastMessage && <div className='toast'>{toastMessage}</div>}
      {error && <div className='alert alert-error'>{error}</div>}

      {/* SUMMARY CARDS */}
      <div className='summary-cards'>
        <div className='card'>
          <h3>Total Stock Value</h3>
          <p className='card-value'>₹{summary?.totalValue?.toFixed(2) || '0.00'}</p>
        </div>
        <div className='card'>
          <h3>Low Stock Items</h3>
          <p className='card-value text-warning'>{summary?.lowStockCount || 0}</p>
        </div>
        <div className='card'>
          <h3>Out of Stock</h3>
          <p className='card-value text-danger'>{summary?.outOfStockCount || 0}</p>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className='inventory-toolbar'>
        <input
          type='text'
          placeholder='Search by Product Name or SKU...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='search-input'
        />
        <select
          value={warehouseFilter}
          onChange={(e) => {
            setWarehouseFilter(e.target.value);
            setPage(1);
          }}
          className='filter-select'
        >
          <option value=''>All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.warehouse_id} value={w.warehouse_id}>
              {w.name || w.warehouse_name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className='filter-select'
        >
          <option value=''>All Statuses</option>
          <option value='normal'>Normal</option>
          <option value='low'>Low Stock</option>
          <option value='out'>Out of Stock</option>
        </select>
        <span className='results-count'>
          Showing {inventory.length} of {totalItemsCount} items
        </span>
      </div>

      {/* INVENTORY TABLE */}
      <div className='table-wrapper'>
        <table className='inventory-table zebra-table'>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Warehouse</th>
              <th>Current Stock</th>
              <th>Reorder Level</th>
              <th>Stock Value</th>
              <th>Status</th>
              {isManagerOrAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isManagerOrAdmin ? 9 : 8} className='text-center'>
                  Loading...
                </td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={isManagerOrAdmin ? 9 : 8} className='text-center'>
                  No inventory items found.
                </td>
              </tr>
            ) : (
              inventory.map((item) => {
                const stockValue = item.quantity * parseFloat(item.unit_price || 0);
                return (
                  <tr key={item.id}>
                    <td>{item.sku}</td>
                    <td>{item.product_name}</td>
                    <td>{item.category}</td>
                    <td>{item.warehouse_name}</td>
                    <td>
                      <strong>{item.quantity}</strong>
                    </td>
                    <td>{item.reorder_level}</td>
                    <td>₹{stockValue.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    {isManagerOrAdmin && (
                      <td>
                        <button
                          className='btn btn-sm btn-outline'
                          onClick={() => {
                            setSelectedItem(item);
                            setActiveModal('update');
                          }}
                        >
                          Edit Qty
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className='pagination'>
          <button disabled={page === 1} onClick={() => handlePageChange(page - 1)}>
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* MODALS */}
      {activeModal === 'update' && (
        <UpdateStockModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onSuccess={() => {
            setActiveModal(null);
            setSelectedItem(null);
            refreshAll();
            showToast('Stock updated successfully');
          }}
        />
      )}
      {activeModal === 'transfer' && (
        <TransferStockModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          products={products}
          warehouses={warehouses}
          onSuccess={() => {
            setActiveModal(null);
            refreshAll();
            showToast('Stock transferred successfully');
          }}
        />
      )}
      {activeModal === 'adjust' && (
        <AdjustStockModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          inventoryList={inventory} // Using current view's inventory or could fetch all
          onSuccess={() => {
            setActiveModal(null);
            refreshAll();
            showToast('Stock adjusted successfully');
          }}
        />
      )}
    </div>
  );
};

/* MODAL COMPONENTS */

const UpdateStockModal = ({ isOpen, onClose, item, onSuccess }) => {
  const formik = useFormik({
    initialValues: { quantity: item?.quantity || 0, reason: '' },
    validationSchema: Yup.object({
      quantity: Yup.number().min(0, 'Must be >= 0').required('Required'),
      reason: Yup.string().required('Reason is required for audit logs'),
    }),
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        await api.put(`/inventory/${item.id}`, values);
        onSuccess();
      } catch (err) {
        setFieldError('reason', err.response?.data?.error || 'Update failed');
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <div className='modal-backdrop'>
      <div className='modal-content'>
        <h2>Edit Quantity</h2>
        <p>
          <strong>Product:</strong> {item?.product_name} ({item?.sku})
        </p>
        <p>
          <strong>Warehouse:</strong> {item?.warehouse_name}
        </p>
        <form onSubmit={formik.handleSubmit}>
          <div className='form-group'>
            <label>New Quantity*</label>
            <input type='number' name='quantity' {...formik.getFieldProps('quantity')} />
            {formik.touched.quantity && formik.errors.quantity && (
              <div className='error'>{formik.errors.quantity}</div>
            )}
          </div>
          <div className='form-group'>
            <label>Reason*</label>
            <input
              type='text'
              name='reason'
              placeholder='e.g. Physical count mismatch'
              {...formik.getFieldProps('reason')}
            />
            {formik.touched.reason && formik.errors.reason && (
              <div className='error'>{formik.errors.reason}</div>
            )}
          </div>
          <div className='modal-actions'>
            <button type='button' className='btn btn-secondary' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary' disabled={formik.isSubmitting}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TransferStockModal = ({ isOpen, onClose, products, warehouses, onSuccess }) => {
  const formik = useFormik({
    initialValues: {
      product_id: '',
      from_warehouse_id: '',
      to_warehouse_id: '',
      quantity: '',
      reason: '',
    },
    validationSchema: Yup.object({
      product_id: Yup.number().required('Required'),
      from_warehouse_id: Yup.number().required('Required'),
      to_warehouse_id: Yup.number()
        .required('Required')
        .notOneOf([Yup.ref('from_warehouse_id')], 'Must be different from source'),
      quantity: Yup.number().positive('Must be positive').required('Required'),
      reason: Yup.string().required('Required'),
    }),
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        await api.post('/inventory/transfer', values);
        onSuccess();
      } catch (err) {
        setFieldError('reason', err.response?.data?.error || 'Transfer failed');
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <div className='modal-backdrop'>
      <div className='modal-content'>
        <h2>Transfer Stock</h2>
        <form onSubmit={formik.handleSubmit}>
          <div className='form-group'>
            <label>Product*</label>
            <select name='product_id' {...formik.getFieldProps('product_id')}>
              <option value=''>Select Product...</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            {formik.touched.product_id && formik.errors.product_id && (
              <div className='error'>{formik.errors.product_id}</div>
            )}
          </div>
          <div className='form-row'>
            <div className='form-group'>
              <label>From Warehouse*</label>
              <select name='from_warehouse_id' {...formik.getFieldProps('from_warehouse_id')}>
                <option value=''>Select Source...</option>
                {warehouses.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name || w.warehouse_name}
                  </option>
                ))}
              </select>
              {formik.touched.from_warehouse_id && formik.errors.from_warehouse_id && (
                <div className='error'>{formik.errors.from_warehouse_id}</div>
              )}
            </div>
            <div className='form-group'>
              <label>To Warehouse*</label>
              <select name='to_warehouse_id' {...formik.getFieldProps('to_warehouse_id')}>
                <option value=''>Select Destination...</option>
                {warehouses.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name || w.warehouse_name}
                  </option>
                ))}
              </select>
              {formik.touched.to_warehouse_id && formik.errors.to_warehouse_id && (
                <div className='error'>{formik.errors.to_warehouse_id}</div>
              )}
            </div>
          </div>
          <div className='form-row'>
            <div className='form-group'>
              <label>Quantity*</label>
              <input type='number' name='quantity' {...formik.getFieldProps('quantity')} />
              {formik.touched.quantity && formik.errors.quantity && (
                <div className='error'>{formik.errors.quantity}</div>
              )}
            </div>
            <div className='form-group'>
              <label>Reason*</label>
              <input type='text' name='reason' {...formik.getFieldProps('reason')} />
              {formik.touched.reason && formik.errors.reason && (
                <div className='error'>{formik.errors.reason}</div>
              )}
            </div>
          </div>
          <div className='modal-actions'>
            <button type='button' className='btn btn-secondary' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary' disabled={formik.isSubmitting}>
              Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdjustStockModal = ({ isOpen, onClose, inventoryList, onSuccess }) => {
  const formik = useFormik({
    initialValues: { inventory_id: '', adjustment_type: 'damage', quantity: '', reason: '' },
    validationSchema: Yup.object({
      inventory_id: Yup.number().required('Required'),
      adjustment_type: Yup.string().oneOf(['damage', 'return', 'correction']).required('Required'),
      quantity: Yup.number()
        .required('Required')
        .test('is-not-zero', 'Quantity cannot be zero', (val) => val !== 0),
      reason: Yup.string().required('Required'),
    }),
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        await api.post('/inventory/adjust', values);
        onSuccess();
      } catch (err) {
        setFieldError('reason', err.response?.data?.error || 'Adjustment failed');
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <div className='modal-backdrop'>
      <div className='modal-content'>
        <h2>Adjust Stock</h2>
        <form onSubmit={formik.handleSubmit}>
          <div className='form-group'>
            <label>Inventory Item*</label>
            <select name='inventory_id' {...formik.getFieldProps('inventory_id')}>
              <option value=''>Select Item to Adjust...</option>
              {inventoryList.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.product_name} ({inv.sku}) in {inv.warehouse_name} (Qty: {inv.quantity})
                </option>
              ))}
            </select>
            {formik.touched.inventory_id && formik.errors.inventory_id && (
              <div className='error'>{formik.errors.inventory_id}</div>
            )}
          </div>
          <div className='form-row'>
            <div className='form-group'>
              <label>Adjustment Type*</label>
              <select name='adjustment_type' {...formik.getFieldProps('adjustment_type')}>
                <option value='damage'>Damage (Subtract)</option>
                <option value='return'>Return (Add)</option>
                <option value='correction'>Correction</option>
              </select>
            </div>
            <div className='form-group'>
              <label>Quantity* (Amount to change by)</label>
              <input type='number' name='quantity' {...formik.getFieldProps('quantity')} />
              {formik.touched.quantity && formik.errors.quantity && (
                <div className='error'>{formik.errors.quantity}</div>
              )}
            </div>
          </div>
          <div className='form-group'>
            <label>Reason*</label>
            <input type='text' name='reason' {...formik.getFieldProps('reason')} />
            {formik.touched.reason && formik.errors.reason && (
              <div className='error'>{formik.errors.reason}</div>
            )}
          </div>
          <div className='modal-actions'>
            <button type='button' className='btn btn-secondary' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary' disabled={formik.isSubmitting}>
              Apply Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
