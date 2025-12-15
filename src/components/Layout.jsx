import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiHome, 
  FiUsers, 
  FiUserCheck, 
  FiBookOpen, 
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiBarChart2,
  FiMenu,
  FiX,
  FiLogOut,
  FiUser,
  FiSettings
} from 'react-icons/fi';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isTeacher } = useAuth();

  // Admin menu items
  const adminMenuItems = [
    { path: '/', label: 'Dashboard', icon: FiHome },
    { path: '/students', label: 'Students', icon: FiUsers },
    { path: '/teachers', label: 'Teachers', icon: FiUserCheck },
    { path: '/classes', label: 'Classes', icon: FiBookOpen },
    { path: '/user-management', label: 'User Management', icon: FiUser },
    { path: '/attendance', label: 'Attendance', icon: FiClipboard },
    { path: '/finance', label: 'Finance', icon: FiDollarSign },
    { path: '/attendance-report', label: 'Attendance Report', icon: FiFileText },
    { path: '/finance-report', label: 'Finance Report', icon: FiBarChart2 },
    { path: '/profile', label: 'My Profile', icon: FiSettings },
  ];

  // Teacher menu items (limited access)
  const teacherMenuItems = [
    { path: '/', label: 'Dashboard', icon: FiHome },
    { path: '/students', label: 'My Students', icon: FiUsers },
    { path: '/attendance', label: 'Mark Attendance', icon: FiClipboard },
    { path: '/profile', label: 'My Profile', icon: FiSettings },
  ];

  const menuItems = isAdmin() ? adminMenuItems : teacherMenuItems;

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Al Taqwa School</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <FiX size={24} />
          </button>
        </div>
        
        {/* User Info */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
              <FiUser className="text-white" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-3 px-3 flex-1 overflow-hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-3 py-2 mb-1 rounded-lg
                  transition-colors duration-200
                  ${isActive(item.path)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="mr-2" size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <FiLogOut className="mr-2" size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-900 mr-4"
          >
            <FiMenu size={24} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {menuItems.find(item => isActive(item.path))?.label || 'Dashboard'}
          </h2>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
