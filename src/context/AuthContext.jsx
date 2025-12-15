import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      // Always start with no user until verification completes
      setUser(null);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        // No token, clear any stale data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      try {
        // Verify token with backend
        const response = await authAPI.getCurrentUser();
        if (response && response.user && response.user.id) {
          // Valid user from backend, set it
          setUser(response.user);
          // Update localStorage with fresh user data
          localStorage.setItem('user', JSON.stringify(response.user));
        } else {
          // Invalid response, clear auth data
          console.log('Invalid user response from backend');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        // Token is invalid or expired, clear auth data
        console.log('Token verification failed, clearing auth data:', error.message);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isTeacher = () => {
    return user?.role === 'teacher';
  };

  const value = {
    user,
    login,
    logout,
    isAdmin,
    isTeacher,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
