import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * ProtectedRoute Component
 * Checks if user is authenticated (via Redux or localStorage) before allowing access to the route
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, token } = useSelector((state) => state.auth);
  const localToken = localStorage.getItem('token');

  // If not authenticated and no token in localStorage, redirect to login
  if (!isAuthenticated && !token && !localToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
