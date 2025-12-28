const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-ms-production.up.railway.app/';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API Call:', url, options.method || 'GET');
    if (options.body) {
      // Don't log full password, but log other fields for debugging
      try {
        const bodyObj = JSON.parse(options.body);
        const sanitizedBody = { ...bodyObj };
        if (sanitizedBody.password) {
          sanitizedBody.password = '***hidden***';
        }
        console.log('Request Body:', sanitizedBody);
        console.log('Full URL:', url);
        console.log('Headers:', headers);
      } catch {
        console.log('Request Body:', options.body.substring(0, 100));
      }
    }

    const response = await fetch(url, {
      headers,
      ...options,
    });

    console.log('Response Status:', response.status, response.statusText);

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
        console.log('Error Response:', error);
      } catch (e) {
        const text = await response.text();
        console.log('Error Response (text):', text);
        error = { message: `Request failed with status ${response.status}` };
      }

      // Handle 401 Unauthorized - but only redirect if NOT on login/register endpoints
      // Login/register endpoints return 401 for invalid credentials, which is normal
      const isAuthEndpoint = endpoint.includes('/api/auth/login') || endpoint.includes('/api/auth/register');
      
      if (response.status === 401 && !isAuthEndpoint) {
        // This is a session expiration, not invalid credentials
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please login again.');
      }

      // Extract the actual error message from the response
      const errorMessage = error.message || error.error || error.error?.message || `Request failed with status ${response.status}`;
      console.error('API Error Response:', error);
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle network errors
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      const errorMessage = `Cannot connect to backend server at ${API_BASE_URL}.\n\nPlease ensure:\n1. Backend server is running (run 'npm start' in backend directory)\n2. Backend is running on port 3000\n3. MongoDB is running\n4. Check browser console for CORS errors`;
      throw new Error(errorMessage);
    }
    
    throw error;
  }
};

// Students API
export const studentAPI = {
  getAll: () => apiCall('/read/student'),
  searchByName: (name) => apiCall(`/search/student?name=${encodeURIComponent(name)}`),
  create: (data) => apiCall('/student', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/update/student/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/delete/student/${id}`, {
    method: 'DELETE',
  }),
  progressEnglishParts: (options = {}) => apiCall('/progress/english-parts', {
    method: 'POST',
    body: JSON.stringify(options),
  }),
};

// Teachers API
export const teacherAPI = {
  getAll: () => apiCall('/read/teacher'),
  create: (data) => apiCall('/teacher', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/update/teacher/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/delete/teacher/${id}`, {
    method: 'DELETE',
  }),
};

// Classes API
export const classAPI = {
  getAll: () => apiCall('/read/class'),
  create: (data) => apiCall('/class', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/update/class/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/delete/class/${id}`, {
    method: 'DELETE',
  }),
};

// Attendance API
export const attendanceAPI = {
  getAll: () => apiCall('/read/attendance'),
  getByClass: (classId, date) => apiCall(`/readByClass/${classId}/${date}`),
  create: (data) => apiCall('/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (data) => apiCall('/update/attendance', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// Finance API
export const financeAPI = {
  getAll: () => apiCall('/read/finance'),
  create: (data) => apiCall('/finance', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/update/finance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/delete/finance/${id}`, {
    method: 'DELETE',
  }),
};

// Attendance Report API
export const attendanceReportAPI = {
  getDailyReport: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/attendanceReport/daily?${queryString}`);
  },
};

// Finance Report API
export const financeReportAPI = {
  getMonthlyReport: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/report/monthly?${queryString}`);
  },
  getStudentReport: (studentId) => apiCall(`/finance/report/student/${studentId}`),
  getSpecificMonthReport: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/report/month?${queryString}`);
  },
  getStudentsPaymentStatus: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/report/students/payment-status${queryString ? `?${queryString}` : ''}`);
  },
};

// Auth API
export const authAPI = {
  login: (data) => apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  register: (data) => apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getCurrentUser: () => apiCall('/api/auth/me'),
  changePassword: (data) => apiCall('/api/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// User Management API (Admin only)
export const userAPI = {
  getAll: () => apiCall('/api/users'),
  getById: (id) => apiCall(`/api/users/${id}`),
  getMyProfile: () => apiCall('/api/users/me'),
  getTeachersWithoutAccounts: () => apiCall('/api/teachers/without-accounts'),
  createTeacherAccount: (data) => apiCall('/api/users/teacher', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateMyProfile: (data) => apiCall('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/api/users/${id}`, {
    method: 'DELETE',
  }),
};

// Dashboard API - aggregate data
export const dashboardAPI = {
  getStats: async () => {
    try {
      const [students, teachers, classes, attendance, finance] = await Promise.all([
        studentAPI.getAll(),
        teacherAPI.getAll(),
        classAPI.getAll(),
        attendanceAPI.getAll(),
        financeAPI.getAll(),
      ]);

      // Calculate today's attendance
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance.filter((att) => {
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

      // Calculate finance totals
      const totalIncome = finance.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      const monthlyFinance = finance.filter(
        (f) => f.month === currentMonth && f.year === currentYear
      );
      const monthlyIncome = monthlyFinance.reduce((sum, f) => sum + (f.amountPaid || 0), 0);

      return {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        todayAttendance: todayPresentCount,
        financeOverview: {
          income: monthlyIncome,
          total: totalIncome,
        },
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },
};

export default {
  authAPI,
  userAPI,
  studentAPI,
  teacherAPI,
  classAPI,
  attendanceAPI,
  financeAPI,
  attendanceReportAPI,
  financeReportAPI,
  dashboardAPI,
};

