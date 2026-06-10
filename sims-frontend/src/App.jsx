import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import store from './store/index';
import { restoreAuth } from './store/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/Toast';
import MainLayout from './layouts/MainLayout';
import UserLayout from './layouts/UserLayout';

// Pages
import Landing from './pages/Landing';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Warehouses from './pages/Warehouses';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import SalesOrders from './pages/SalesOrders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UserDashboard from './pages/user/UserDashboard';
import Catalog from './pages/user/Catalog';
import MyRequests from './pages/user/MyRequests';
import RequestsManagement from './pages/RequestsManagement';
import ImportCenter from './pages/ImportCenter';
import AutomationDashboard from './pages/AutomationDashboard';

import './App.css';

const AppContent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Restore auth from localStorage on app load
    dispatch(restoreAuth());
  }, [dispatch]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path='/' element={<LandingPage />} />
      <Route path='/login' element={<Login />} />
      <Route path='/register' element={<Register />} />

      {/* User Requester Dashboard */}
      <Route
        path='/user-dashboard'
        element={
          <ProtectedRoute roles={['user', 'staff']}>
            <UserLayout>
              <UserDashboard />
            </UserLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path='/user/catalog'
        element={
          <ProtectedRoute roles={['user', 'staff']}>
            <UserLayout>
              <Catalog />
            </UserLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path='/user/my-requests'
        element={
          <ProtectedRoute roles={['user', 'staff']}>
            <UserLayout>
              <MyRequests />
            </UserLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected Admin/Manager/Staff Routes */}
      <Route
        path='/dashboard'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/requests'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <MainLayout>
              <RequestsManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/import-center'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <MainLayout>
              <ImportCenter />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/automation'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <MainLayout>
              <AutomationDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/products'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <Products />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/inventory'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <Inventory />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/warehouses'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <Warehouses />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/suppliers'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <Suppliers />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/purchase-orders'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <PurchaseOrders />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/sales-orders'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <SalesOrders />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/reports'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <Reports />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/settings'
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <MainLayout>
              <Settings />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path='/' element={<Navigate to='/dashboard' replace />} />
      <Route path='*' element={<Navigate to='/dashboard' replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
          <Toast />
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  );
}

export default App;
