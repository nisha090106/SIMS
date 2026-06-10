import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * ProtectedRoute Component
 * Checks if user is authenticated (via Redux or localStorage) before allowing access to the route
 * Supports checking user roles and redirecting accordingly
 */
const ProtectedRoute = ({ children, allowedRoles, roles }) => {
  const { isAuthenticated, token, user } = useSelector((state) => state.auth);
  const localToken = localStorage.getItem('token');

  // If not authenticated and no token in localStorage, redirect to login
  if (!isAuthenticated && !token && !localToken) {
    return <Navigate to='/login' replace />;
  }

  const rolesToCheck = allowedRoles || roles;

  // If we have rolesToCheck configured and user role is loaded
  if (user && rolesToCheck && !rolesToCheck.includes(user.role)) {
    // Redirect 'user' role to their dashboard, other roles to admin/manager dashboard
    if (user.role === 'user') {
      return <Navigate to='/user-dashboard' replace />;
    } else {
      return <Navigate to='/dashboard' replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
