import { useState, useEffect } from 'react';
import { FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { classAPI } from '../services/api';

const Profile = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const data = await classAPI.getAll();
      setClasses(data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const getClassName = () => {
    if (!user?.classId) return 'N/A';
    const assignedClass = classes.find(
      cls => cls._id === user.classId || cls._id === user.classId?._id
    );
    return assignedClass?.className || 'N/A';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>

      {/* Account Information Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-100 p-3 rounded-lg">
            <FiUser className="text-purple-600" size={24} />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Account Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Full Name</p>
            <p className="text-lg font-semibold text-gray-800">{user?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Email</p>
            <p className="text-lg font-semibold text-gray-800">{user?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Role</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              user?.role === 'admin' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user?.role?.toUpperCase() || 'N/A'}
            </span>
          </div>
          {user?.classId && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Assigned Class</p>
              <p className="text-lg font-semibold text-gray-800">{getClassName()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

