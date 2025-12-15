import { useState, useEffect } from 'react';
import { FiUsers, FiUserCheck, FiBookOpen, FiClipboard, FiDollarSign, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    todayAttendance: 0,
    financeOverview: {
      income: 0,
      total: 0,
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAdmin, isTeacher } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await dashboardAPI.getStats();
        
        // Filter stats for teachers - only show their class data
        if (isTeacher() && user?.classId) {
          // Fetch students and attendance filtered by class
          const { studentAPI, attendanceAPI } = await import('../services/api');
          const allStudents = await studentAPI.getAll();
          const allAttendance = await attendanceAPI.getAll();
          
          // Filter students by teacher's class
          const classStudents = allStudents.filter(s => 
            s.classId?._id === user.classId || s.classId === user.classId
          );
          
          // Filter attendance by teacher's class
          const classAttendance = allAttendance.filter(att => 
            att.classId?._id === user.classId || att.classId === user.classId
          );
          
          // Calculate today's attendance for this class
          const today = new Date().toISOString().split('T')[0];
          const todayAttendance = classAttendance.filter((att) => {
            if (att.students && att.students.length > 0) {
              const attDate = new Date(att.students[0].date).toISOString().split('T')[0];
              return attDate === today;
            }
            return false;
          });
          
          let todayPresentCount = 0;
          todayAttendance.forEach((att) => {
            if (att.students) {
              todayPresentCount += att.students.filter((s) => s.status === 'Present').length;
            }
          });
          
          setStats({
            totalStudents: classStudents.length,
            totalTeachers: 1, // Only themselves
            totalClasses: 1, // Only their class
            todayAttendance: todayPresentCount,
            financeOverview: {
              income: 0, // Teachers don't see finance
              total: 0,
            }
          });
        } else {
          setStats(data);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, isTeacher]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  const cards = [
    {
      title: isTeacher() ? 'My Students' : 'Total Students',
      value: stats.totalStudents,
      icon: FiUsers,
      color: 'bg-blue-500',
      change: '+12%',
      trend: 'up',
      show: true
    },
    {
      title: 'Total Teachers',
      value: stats.totalTeachers,
      icon: FiUserCheck,
      color: 'bg-green-500',
      change: '+5%',
      trend: 'up',
      show: isAdmin()
    },
    {
      title: isTeacher() ? 'My Class' : 'Total Classes',
      value: stats.totalClasses,
      icon: FiBookOpen,
      color: 'bg-purple-500',
      change: '+2',
      trend: 'up',
      show: true
    },
    {
      title: 'Today Attendance',
      value: `${stats.todayAttendance}/${stats.totalStudents}`,
      icon: FiClipboard,
      color: 'bg-orange-500',
      change: stats.totalStudents > 0 ? `${Math.round((stats.todayAttendance / stats.totalStudents) * 100)}%` : '0%',
      trend: 'up',
      show: true
    },
    {
      title: 'Monthly Income',
      value: `$${stats.financeOverview.income.toLocaleString()}`,
      icon: FiDollarSign,
      color: 'bg-emerald-500',
      change: '+8%',
      trend: 'up',
      show: isAdmin()
    },
    {
      title: 'Total Income',
      value: `$${stats.financeOverview.total.toLocaleString()}`,
      icon: FiDollarSign,
      color: 'bg-indigo-500',
      change: 'All time',
      trend: 'up',
      show: isAdmin()
    }
  ].filter(card => card.show);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                  <div className="flex items-center mt-2">
                    {card.trend === 'up' ? (
                      <FiArrowUp className="text-green-500 mr-1" size={16} />
                    ) : (
                      <FiArrowDown className="text-red-500 mr-1" size={16} />
                    )}
                    <span className={`text-sm ${card.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {card.change}
                    </span>
                    {card.title !== 'Total Income' && <span className="text-sm text-gray-500 ml-1">vs last month</span>}
                  </div>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={28} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Finance Summary Card - Only for Admin */}
      {isAdmin() && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Finance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Monthly Income</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.financeOverview.income.toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-blue-600">
                ${stats.financeOverview.total.toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Average per Month</p>
              <p className="text-2xl font-bold text-purple-600">
                ${stats.financeOverview.total > 0 ? Math.round(stats.financeOverview.total / 12).toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
