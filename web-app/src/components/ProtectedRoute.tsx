import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';

type Props = {
  children: JSX.Element;
};

// Renders children only after auth state resolves. Avoids redirecting away on refresh.
const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useWebAuth();
  const location = useLocation();

  if (loading) {
    // No blocking UI per request; render nothing until auth resolves
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;



