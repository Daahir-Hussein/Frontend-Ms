import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import AttendanceReport from './pages/AttendanceReport';
import Finance from './pages/Finance';
import FinanceReport from './pages/FinanceReport';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Root path shows dashboard (protected) - requires authentication */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      {/* Login page */}
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <Layout>
              <Students />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/teachers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <Teachers />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/classes"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <Classes />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/user-management"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <Attendance />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/attendance-report"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AttendanceReport />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/finance"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <Finance />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/finance-report"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <FinanceReport />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
