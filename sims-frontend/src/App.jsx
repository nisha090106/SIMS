import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store/index';
import { restoreAuth } from './store/authSlice';
import { ToastProvider } from './context/ToastContext';

// UI Toast (new token-based)
import UIToast from './components/ui/Toast';

// Layouts
import AppLayout       from './layouts/AppLayout';
import RequesterLayout from './layouts/RequesterLayout';

// Auth guard
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import Login       from './pages/Login';
import Register    from './pages/Register';
import NotFound    from './pages/NotFound';

// Admin / Manager / Staff pages
import Dashboard          from './pages/Dashboard';
import Products           from './pages/Products';
import ProductDetail      from './pages/Products/ProductDetail';
import Inventory          from './pages/Inventory';
import Warehouses         from './pages/Warehouses';
import WarehouseDetail    from './pages/Warehouses/WarehouseDetail';
import Suppliers          from './pages/Suppliers';
import SupplierDetail     from './pages/Suppliers/SupplierDetail';
import PurchaseOrders     from './pages/PurchaseOrders';
import PurchaseOrderForm  from './pages/PurchaseOrders/PurchaseOrderForm';
import PurchaseOrderDetail from './pages/PurchaseOrders/PurchaseOrderDetail';
import SalesOrders        from './pages/SalesOrders';
import Reports            from './pages/Reports';
import Settings           from './pages/Settings';
import Notifications      from './pages/Notifications';
import RequestsManagement from './pages/RequestsManagement';
import ImportCenter        from './pages/BulkImport';        // new folder module
import AutomationDashboard from './pages/AutomationDashboard';

// Requester pages
import UserDashboard from './pages/user/UserDashboard';
import Catalog       from './pages/user/Catalog';
import MyRequests    from './pages/user/MyRequests';

import './App.css';

/* ── Role-aware redirect after login ─────────────────────────── */
const RoleRedirect = () => {
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'user') return <Navigate to="/user-dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

/* ── App content (needs Redux + Router context) ────────────────── */
const AppContent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────── */}
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ── Role redirect (e.g. after login) ───────────────────── */}
      <Route path="/home" element={<RoleRedirect />} />

      {/* ── Admin / Manager / Staff — AppLayout with Outlet ────── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard"       element={<Dashboard />} />
        <Route path="/products"        element={<Products />} />
        <Route path="/products/:id"    element={<ProductDetail />} />
        <Route path="/inventory"       element={<Inventory />} />
        <Route path="/warehouses"      element={<Warehouses />} />
        <Route path="/warehouses/:id"  element={<WarehouseDetail />} />
        <Route path="/suppliers"       element={<Suppliers />} />
        <Route path="/suppliers/:id"   element={<SupplierDetail />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderForm />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
        <Route path="/sales-orders"    element={<SalesOrders />} />
        <Route path="/reports"         element={<Reports />} />
        <Route path="/notifications"   element={<Notifications />} />
        <Route path="/settings"        element={<Settings />} />
        <Route path="/barcode"         element={<AutomationDashboard />} />

        {/* Admin + Manager only */}
        <Route
          path="/requests"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <RequestsManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import-center"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <ImportCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/automation"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <AutomationDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ── Requester — RequesterLayout with Outlet ─────────────── */}
      <Route
        element={
          <ProtectedRoute roles={['user', 'staff']}>
            <RequesterLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/user-dashboard"   element={<UserDashboard />} />
        <Route path="/user/catalog"     element={<Catalog />} />
        <Route path="/user/my-requests" element={<MyRequests />} />
      </Route>

      {/* ── 404 ─────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

/* ── Root App ─────────────────────────────────────────────────── */
function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
          {/* Token-based toast renderer */}
          <UIToast />
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  );
}

export default App;
