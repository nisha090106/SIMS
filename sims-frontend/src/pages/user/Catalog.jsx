import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  ClearAll as ClearIcon,
} from '@mui/icons-material';
import { requestAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import '../../styles/Catalog.css';

const Catalog = () => {
  const { user } = useSelector((state) => state.auth);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Catalog Data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false); // Mobile collapsible state

  // Request Cart State (Local state)
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem(`requester_cart_${user?.id}`);
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Popover State (for adding item inline)
  const [activePopoverId, setActivePopoverId] = useState(null);
  const [popoverQty, setPopoverQty] = useState(1);
  const popoverRef = useRef(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Catalog
  useEffect(() => {
    const fetchCatalogData = async () => {
      setLoading(true);
      try {
        const res = await requestAPI.getCatalog({ page: 1, limit: 100 });
        if (res.data && res.data.success) {
          setProducts(res.data.data);
        } else {
          setError('Failed to fetch catalog.');
        }
      } catch (err) {
        console.error('Error fetching catalog:', err);
        setError('Error loading catalog products. Please check if the API is online.');
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogData();
  }, []);

  // Search Input Debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Persist Cart
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`requester_cart_${user.id}`, JSON.stringify(cart));
    }
  }, [cart, user?.id]);

  // Click outside popover to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setActivePopoverId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get Unique Categories
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  // Handle Category Toggle
  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  // Clear All Filters
  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedCategories([]);
    setAvailabilityFilter('all');
  };

  // Open Popover
  const handleAddClick = (product, event) => {
    event.stopPropagation();
    setActivePopoverId(product.id);
    setPopoverQty(1);
  };

  // Confirm Add to Cart
  const confirmAddToCart = (product) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += popoverQty;
        return copy;
      } else {
        return [...prev, { product, quantity: popoverQty }];
      }
    });
    showToast(`Added ${popoverQty} x ${product.name} to request cart.`, 'success');
    setActivePopoverId(null);
  };

  // Remove from Cart
  const handleRemoveFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removed from cart.', 'info');
  };

  // Update Cart Qty Inline
  const updateCartItemQty = (productId, amount) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + amount;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  // Submit Request Form
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!purpose.trim()) {
      showToast('Please provide a purpose for the request.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        purpose: purpose.trim(),
        department: department.trim() || null,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity_requested: item.quantity,
          notes: '',
        })),
      };

      const res = await requestAPI.create(payload);
      if (res.data && res.data.success) {
        showToast(`Request ${res.data.data.request_number} submitted!`, 'success');
        setCart([]);
        setPurpose('');
        setDepartment('');
        setIsModalOpen(false);
        navigate('/user/my-requests');
      }
    } catch (err) {
      console.error('Request creation failed:', err);
      const msg = err.response?.data?.error || 'Failed to submit request order.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // In-Browser Filtering logic
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(debouncedSearch.toLowerCase());

    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(product.category);

    const matchesAvailability =
      availabilityFilter === 'all' || product.availability_status === availabilityFilter;

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className='catalog-page'>
      {/* Page Header */}
      <header className='catalog-header'>
        <div className='header-info'>
          <h1>Product Catalog</h1>
          <p>Request tools, office supplies, and warehouse items directly from logistics</p>
        </div>
        <div className='catalog-main-search'>
          <SearchIcon className='main-search-icon' />
          <input
            type='text'
            placeholder='Search items by name or SKU code...'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className='catalog-layout'>
        {/* Left Filter Toggle for Mobile */}
        <button className='filters-mobile-toggle' onClick={() => setIsFiltersOpen(!isFiltersOpen)}>
          <FilterIcon className='icon' />
          <span>{isFiltersOpen ? 'Hide Filters' : 'Show Filters'}</span>
        </button>

        {/* Left Filter Panel */}
        <aside className={`filters-panel ${isFiltersOpen ? 'mobile-open' : ''}`}>
          <div className='filter-section'>
            <h3>Filter Categories</h3>
            <div className='checkboxes-list'>
              {categories.map((cat) => (
                <label key={cat} className='checkbox-label'>
                  <input
                    type='checkbox'
                    checked={selectedCategories.includes(cat)}
                    onChange={() => handleCategoryChange(cat)}
                  />
                  <span>{cat}</span>
                </label>
              ))}
              {categories.length === 0 && <span className='no-data-text'>No categories found</span>}
            </div>
          </div>

          <div className='filter-section'>
            <h3>Item Availability</h3>
            <div className='radios-list'>
              {[
                { label: 'All Products', value: 'all' },
                { label: 'In Stock', value: 'in_stock' },
                { label: 'Low Stock', value: 'low_stock' },
                { label: 'Out of Stock', value: 'out_of_stock' },
              ].map((opt) => (
                <label key={opt.value} className='radio-label'>
                  <input
                    type='radio'
                    name='availability'
                    value={opt.value}
                    checked={availabilityFilter === opt.value}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button className='clear-filters-btn' onClick={handleClearFilters}>
            <ClearIcon className='clear-icon' />
            <span>Clear all filters</span>
          </button>

          <hr className='filter-divider' />

          <div className='results-indicator'>
            Showing <strong>{filteredProducts.length}</strong> products
          </div>
        </aside>

        {/* Right Product Grid */}
        <main className='products-grid-container'>
          {loading ? (
            <div className='grid-loading'>
              <div className='spinner'></div>
              <p>Fetching catalog products...</p>
            </div>
          ) : error ? (
            <div className='grid-error'>
              <InfoIcon className='err-icon' />
              <p>{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className='grid-empty'>
              <p>No products match your search or filter requirements.</p>
              <button onClick={handleClearFilters}>Reset Catalog Filters</button>
            </div>
          ) : (
            <div className='catalog-products-grid'>
              {filteredProducts.map((prod) => (
                <div key={prod.id} className='product-item-card'>
                  {/* Card Header Tags */}
                  <div className='card-top-tags'>
                    <span className='category-badge'>{prod.category || 'General'}</span>
                    <span className='unit-label'>{prod.unit || 'piece'}</span>
                  </div>

                  {/* Product Details */}
                  <div className='card-product-details'>
                    <h2 className='product-title' title={prod.name}>
                      {prod.name}
                    </h2>

                    {/* Status Badge */}
                    <div className='badge-row'>
                      {prod.availability_status === 'in_stock' && (
                        <span className='stock-badge in_stock'>In Stock</span>
                      )}
                      {prod.availability_status === 'low_stock' && (
                        <span className='stock-badge low_stock'>
                          <WarningIcon className='badge-icon' />
                          <span>Order soon</span>
                        </span>
                      )}
                      {prod.availability_status === 'out_of_stock' && (
                        <span className='stock-badge out_of_stock'>Currently unavailable</span>
                      )}
                    </div>

                    <p className='product-desc' title={prod.description}>
                      {prod.description || 'No product description available.'}
                    </p>
                  </div>

                  {/* Add action with inline Quantity popover */}
                  <div className='card-action-box'>
                    {prod.availability_status !== 'out_of_stock' ? (
                      <div className='popover-btn-container'>
                        <button
                          className='add-to-request-cta'
                          onClick={(e) => handleAddClick(prod, e)}
                        >
                          <CartIcon className='icon' />
                          <span>Add to Request</span>
                        </button>

                        {/* Inline Popover */}
                        {activePopoverId === prod.id && (
                          <div
                            className='qty-popover'
                            ref={popoverRef}
                            onClick={(e) => event.stopPropagation()}
                          >
                            <div className='popover-arrow'></div>
                            <div className='popover-title'>Specify Quantity</div>
                            <div className='popover-adjuster'>
                              <button
                                type='button'
                                className='popover-adjust-btn'
                                onClick={() => setPopoverQty(Math.max(1, popoverQty - 1))}
                              >
                                <RemoveIcon />
                              </button>
                              <span className='popover-qty-val'>{popoverQty}</span>
                              <button
                                type='button'
                                className='popover-adjust-btn'
                                onClick={() => setPopoverQty(popoverQty + 1)}
                              >
                                <AddIcon />
                              </button>
                            </div>
                            <button
                              type='button'
                              className='popover-confirm-btn'
                              onClick={() => confirmAddToCart(prod)}
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button className='add-to-request-cta disabled' disabled>
                        Currently unavailable
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button className='floating-cart-trigger' onClick={() => setIsModalOpen(true)}>
          <div className='floating-cart-badge'>{totalCartItemsCount}</div>
          <CartIcon className='floating-icon' />
          <span>Review & Submit ({totalCartItemsCount} items)</span>
        </button>
      )}

      {/* Request Review Modal */}
      {isModalOpen && (
        <div className='catalog-modal-overlay'>
          <div className='catalog-modal-box'>
            {/* Modal Header */}
            <div className='catalog-modal-header'>
              <h2>Review Item Request</h2>
              <button className='modal-close-icon-btn' onClick={() => setIsModalOpen(false)}>
                <CloseIcon />
              </button>
            </div>

            {/* Modal Body */}
            <div className='catalog-modal-body'>
              <div className='modal-section-title'>Requested Items List</div>
              <div className='modal-items-table-container'>
                <table className='modal-cart-table'>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Unit</th>
                      <th className='align-center'>Quantity</th>
                      <th className='align-center'>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.product.id}>
                        <td>
                          <div className='table-item-name'>{item.product.name}</div>
                          <div className='table-item-category'>{item.product.category}</div>
                        </td>
                        <td>{item.product.unit || 'piece'}</td>
                        <td className='align-center'>
                          <div className='table-qty-adjuster'>
                            <button
                              type='button'
                              onClick={() => updateCartItemQty(item.product.id, -1)}
                            >
                              <RemoveIcon />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type='button'
                              onClick={() => updateCartItemQty(item.product.id, 1)}
                            >
                              <AddIcon />
                            </button>
                          </div>
                        </td>
                        <td className='align-center'>
                          <button
                            type='button'
                            className='table-delete-btn'
                            onClick={() => handleRemoveFromCart(item.product.id)}
                          >
                            <DeleteIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form Info fields */}
              <form className='modal-submission-form-container' onSubmit={handleSubmitRequest}>
                <div className='modal-form-group'>
                  <label htmlFor='modal-department'>Department / Cost Center</label>
                  <input
                    id='modal-department'
                    type='text'
                    placeholder='e.g. Sales, Quality Assurance, IT (Optional)'
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className='modal-form-group'>
                  <label htmlFor='modal-purpose'>Purpose of Request *</label>
                  <textarea
                    id='modal-purpose'
                    rows='3'
                    placeholder='Explain why these items are required for operations...'
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className='modal-actions-row'>
                  <button
                    type='button'
                    className='modal-btn cancel'
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type='submit' className='modal-btn submit' disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;
