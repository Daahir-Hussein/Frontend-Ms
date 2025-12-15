import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Require authentication - no user means redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Validate user has a valid role (admin or teacher)
  if (user.role !== 'admin' && user.role !== 'teacher') {
    // Invalid role, clear auth and redirect to login
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check if user's role is allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // User doesn't have required role, redirect to root (dashboard)
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
