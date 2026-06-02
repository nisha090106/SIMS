import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';
import '../styles/Products.css';

const Products = () => {
  const { user } = useSelector((state) => state.auth);
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // UI State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: { page, limit: 10, search: debouncedSearch, category: categoryFilter }
      });
      setProducts(res.data.data.products);
      setTotalPages(res.data.data.totalPages);
      setTotalProducts(res.data.data.total);
      
      // Update categories list from all items if needed, or we can just fetch categories distinctively
      // For now, extract from fetched products to populate the dropdown (Note: this is limited to current page, ideally should be a separate endpoint but we'll collect from current fetch)
      const uniqueCats = [...new Set(res.data.data.products.map(p => p.category))];
      setCategories(prev => [...new Set([...prev, ...uniqueCats])]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product, e) => {
    e.stopPropagation();
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (product, e) => {
    e.stopPropagation();
    setDeleteConfirm(product);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/products/${deleteConfirm.product_id}`);
      showToast('Product deleted successfully');
      setDeleteConfirm(null);
      fetchProducts();
      if (selectedProduct?.product_id === deleteConfirm.product_id) setSelectedProduct(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const loadProductDetails = async (product) => {
    try {
      const res = await api.get(`/products/${product.product_id}`);
      setSelectedProduct(res.data.data);
    } catch (err) {
      setError('Failed to load product details');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="products-container">
      {/* HEADER */}
      <div className="products-header">
        <h1>Products</h1>
        {isManagerOrAdmin && (
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Product
          </button>
        )}
      </div>

      {toastMessage && <div className="toast">{toastMessage}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* TOOLBAR */}
      <div className="products-toolbar">
        <input
          type="text"
          placeholder="Search by SKU or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="category-select"
        >
          <option value="">All Categories</option>
          {categories.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>
        <span className="results-count">
          Showing {products.length} of {totalProducts} products
        </span>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table className="products-table zebra-table">
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Unit Price (₹)</th>
              <th>Reorder Level</th>
              <th>Stock</th>
              {isManagerOrAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isManagerOrAdmin ? 9 : 8} className="text-center">Loading...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={isManagerOrAdmin ? 9 : 8} className="text-center">No products found.</td>
              </tr>
            ) : (
              products.map((p, index) => (
                <tr key={p.product_id} onClick={() => loadProductDetails(p)}>
                  <td>{(page - 1) * 10 + index + 1}</td>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.unit}</td>
                  <td>₹{Number(p.unit_price).toFixed(2)}</td>
                  <td>{p.reorder_level}</td>
                  <td>
                    <span className={`stock-badge ${p.totalStock <= p.reorder_level ? 'low-stock' : ''}`}>
                      {p.totalStock}
                    </span>
                  </td>
                  {isManagerOrAdmin && (
                    <td className="actions-cell">
                      <button className="icon-btn edit-btn" onClick={(e) => openEditModal(p, e)} title="Edit">✏️</button>
                      {isAdmin && (
                        <button className="icon-btn delete-btn" onClick={(e) => handleDeleteClick(p, e)} title="Delete">🗑️</button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => handlePageChange(page - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Next</button>
        </div>
      )}

      {/* PRODUCT DETAIL SIDE PANEL */}
      <div className={`side-panel ${selectedProduct ? 'open' : ''}`}>
        {selectedProduct && (
          <div className="panel-content">
            <button className="close-btn" onClick={() => setSelectedProduct(null)}>✕</button>
            <h2>{selectedProduct.name}</h2>
            <p className="sku-badge">SKU: {selectedProduct.sku}</p>
            <p><strong>Category:</strong> {selectedProduct.category}</p>
            <p><strong>Description:</strong> {selectedProduct.description || 'N/A'}</p>
            <hr />
            <h3>Inventory Breakdown</h3>
            {selectedProduct.inventory?.length > 0 ? (
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Qty</th>
                    <th>Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.inventory.map(inv => (
                    <tr key={inv.inventory_id}>
                      <td>{inv.warehouse?.name || inv.warehouse_id}</td>
                      <td>{inv.quantity}</td>
                      <td>{inv.batch_no || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No inventory data found.</p>
            )}
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <ProductModal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          editingProduct={editingProduct}
          onSuccess={() => {
            closeModal();
            fetchProducts();
            showToast(editingProduct ? 'Product updated successfully' : 'Product created successfully');
          }}
          categories={categories}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirm && (
        <div className="modal-backdrop">
          <div className="confirm-dialog">
            <h3>Delete Product</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductModal = ({ isOpen, onClose, editingProduct, onSuccess, categories }) => {
  const formik = useFormik({
    initialValues: {
      sku: editingProduct?.sku || '',
      name: editingProduct?.name || '',
      category: editingProduct?.category || '',
      unit: editingProduct?.unit || 'piece',
      unit_price: editingProduct?.unit_price || '',
      reorder_level: editingProduct?.reorder_level || 10,
      reorder_qty: editingProduct?.reorder_qty || 50,
      description: editingProduct?.description || '',
    },
    validationSchema: Yup.object({
      sku: Yup.string().required('SKU is required'),
      name: Yup.string().min(2, 'Must be at least 2 characters').required('Name is required'),
      category: Yup.string().required('Category is required'),
      unit_price: Yup.number().positive('Must be positive').required('Unit Price is required'),
      reorder_level: Yup.number().min(0).required('Reorder Level is required'),
      reorder_qty: Yup.number().min(0),
    }),
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        if (editingProduct) {
          await api.put(`/products/${editingProduct.product_id}`, values);
        } else {
          await api.post('/products', values);
        }
        onSuccess();
      } catch (err) {
        if (err.response?.data?.errors) {
          err.response.data.errors.forEach(e => setFieldError(e.field, e.message));
        } else {
          setFieldError('sku', err.response?.data?.error || 'Failed to save product');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
        <form onSubmit={formik.handleSubmit}>
          <div className="form-group">
            <label>SKU*</label>
            <input 
              type="text" 
              name="sku" 
              disabled={!!editingProduct}
              {...formik.getFieldProps('sku')} 
            />
            {formik.touched.sku && formik.errors.sku ? <div className="error">{formik.errors.sku}</div> : null}
          </div>

          <div className="form-group">
            <label>Product Name*</label>
            <input type="text" name="name" {...formik.getFieldProps('name')} />
            {formik.touched.name && formik.errors.name ? <div className="error">{formik.errors.name}</div> : null}
          </div>

          <div className="form-group">
            <label>Category*</label>
            <input 
              type="text" 
              name="category" 
              list="category-options"
              {...formik.getFieldProps('category')} 
            />
            <datalist id="category-options">
              {categories.map((c, i) => <option key={i} value={c} />)}
            </datalist>
            {formik.touched.category && formik.errors.category ? <div className="error">{formik.errors.category}</div> : null}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Unit Price (₹)*</label>
              <input type="number" step="0.01" name="unit_price" {...formik.getFieldProps('unit_price')} />
              {formik.touched.unit_price && formik.errors.unit_price ? <div className="error">{formik.errors.unit_price}</div> : null}
            </div>
            <div className="form-group">
              <label>Unit</label>
              <input type="text" name="unit" {...formik.getFieldProps('unit')} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Reorder Level*</label>
              <input type="number" name="reorder_level" {...formik.getFieldProps('reorder_level')} />
              {formik.touched.reorder_level && formik.errors.reorder_level ? <div className="error">{formik.errors.reorder_level}</div> : null}
            </div>
            <div className="form-group">
              <label>Reorder Qty</label>
              <input type="number" name="reorder_qty" {...formik.getFieldProps('reorder_qty')} />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea name="description" {...formik.getFieldProps('description')} rows="3"></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Products;
