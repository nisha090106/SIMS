import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * ProtectedRoute
 *
 * Works in two modes:
 *
 * 1. Layout route (no children) — wraps an <Outlet />
 *    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
 *      <Route path="/dashboard" element={<Dashboard />} />
 *    </Route>
 *
 * 2. Direct children — renders children or redirects
 *    <ProtectedRoute allowedRoles={['admin']}>
 *      <Dashboard />
 *    </ProtectedRoute>
 */
const ProtectedRoute = ({ children, allowedRoles, roles }) => {
  const { isAuthenticated, token, user } = useSelector((state) => state.auth);
  const localToken = localStorage.getItem('token');

  // Not authenticated at all → login
  if (!isAuthenticated && !token && !localToken) {
    return <Navigate to="/login" replace />;
  }

  const rolesToCheck = allowedRoles || roles;

  // Role check (only once user is loaded from Redux)
  if (user && rolesToCheck && !rolesToCheck.includes(user.role)) {
    // Requester goes to their portal; everyone else to admin dashboard
    return user.role === 'user'
      ? <Navigate to="/user-dashboard" replace />
      : <Navigate to="/dashboard" replace />;
  }

  // Layout route mode — render Outlet so nested routes work
  if (!children) return <Outlet />;

  // Direct children mode
  return children;
};

export default ProtectedRoute;
