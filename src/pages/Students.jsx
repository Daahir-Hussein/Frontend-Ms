import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiRefreshCw } from 'react-icons/fi';
import { studentAPI, classAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressing, setProgressing] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedParts, setSelectedParts] = useState([]);
  const [progressMode, setProgressMode] = useState('all'); // 'all', 'byPart'
  const [formData, setFormData] = useState({
    fullName: '',
    classId: '',
    shift: 'Morning',
    Parts: 'None',
    phone: '',
    emergencyPhone: ''
  });
  const { user, isAdmin, isTeacher } = useAuth();

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [user]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getAll();
      // Filter students for teachers - only show students in their assigned class
      if (isTeacher() && user?.classId) {
        const filtered = data.filter(s => 
          s.classId?._id === user.classId || s.classId === user.classId
        );
        setStudents(filtered);
      } else {
        setStudents(data);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await classAPI.getAll();
      setClasses(data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const filteredStudents = students.filter(student => {
    // Search filter
    const studentName = student.fullName?.toLowerCase() || '';
    const className = student.classId?.className?.toLowerCase() || '';
    const matchesSearch = !searchTerm || 
      studentName.includes(searchTerm.toLowerCase()) || 
      className.includes(searchTerm.toLowerCase());
    
    // Class filter
    const matchesClass = !selectedClass || 
      student.classId?._id === selectedClass || 
      student.classId === selectedClass;
    
    // Parts filter
    const matchesPart = !selectedPart || 
      student.Parts === selectedPart;
    
    // Shift filter
    const matchesShift = !selectedShift || 
      student.shift === selectedShift;
    
    return matchesSearch && matchesClass && matchesPart && matchesShift;
  });

  const handleAdd = () => {
    setEditingStudent(null);
    setFormData({ fullName: '', classId: '', shift: 'Morning', Parts: 'None', phone: '', emergencyPhone: '' });
    setShowModal(true);
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName || '',
      classId: student.classId?._id || student.classId || '',
      shift: student.shift || 'Morning',
      Parts: student.Parts || 'None',
      phone: student.phone || '',
      emergencyPhone: student.emergencyPhone || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentAPI.delete(id);
        await fetchStudents();
      } catch (err) {
        alert('Failed to delete student: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await studentAPI.update(editingStudent._id, formData);
      } else {
        await studentAPI.create(formData);
      }
      setShowModal(false);
      await fetchStudents();
    } catch (err) {
      alert('Failed to save student: ' + err.message);
    }
  };

  const handleProgressEnglishParts = async () => {
    let options = {};
    
    if (progressMode === 'byPart' && selectedParts.length > 0) {
      options.fromParts = selectedParts;
    }
    
    try {
      setProgressing(true);
      const result = await studentAPI.progressEnglishParts(options);
      alert(`✅ ${result.message}\n\nUpdated: ${result.updated} students\n\nDetails:\n${Object.entries(result.details || {}).map(([key, value]) => value > 0 ? `${key}: ${value}` : '').filter(Boolean).join('\n') || 'No progressions made'}`);
      await fetchStudents();
      setShowProgressModal(false);
      setSelectedParts([]);
      setProgressMode('all');
    } catch (err) {
      alert('Failed to progress English parts: ' + err.message);
    } finally {
      setProgressing(false);
    }
  };

  const togglePartSelection = (part) => {
    setSelectedParts(prev => 
      prev.includes(part) 
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const allParts = ["Part 0", "Part 1", "Part 2", "Part 3", "Part 4", "Part 5", "Part 6", "Part 7", "New Top One", "Top One"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading students...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          {isTeacher() ? 'My Students' : 'Students Management'}
        </h1>
        {isAdmin() && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowProgressModal(true)}
              disabled={progressing}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Progress English students to next part (manual control)"
            >
              <FiRefreshCw size={20} className={progressing ? 'animate-spin' : ''} />
              {progressing ? 'Progressing...' : 'Progress English Parts'}
            </button>
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FiPlus size={20} />
              Add Student
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Bar */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Class Filter */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>{cls.className}</option>
              ))}
            </select>
          </div>
          
          {/* Parts Filter */}
          <div>
            <select
              value={selectedPart}
              onChange={(e) => setSelectedPart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Parts</option>
              <option value="None">None</option>
              <option value="Part 0">Part 0</option>
              <option value="Part 1">Part 1</option>
              <option value="Part 2">Part 2</option>
              <option value="Part 3">Part 3</option>
              <option value="Part 4">Part 4</option>
              <option value="Part 5">Part 5</option>
              <option value="Congratulations">Congratulations</option>
            </select>
          </div>
          
          {/* Shift Filter */}
          <div>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Shifts</option>
              <option value="Morning">Morning</option>
              <option value="Noon">Noon</option>
              <option value="AfterNoon">Afternoon</option>
              <option value="Night">Night</option>
              <option value="Khamiis iyo Jimco">Khamiis iyo Jimco</option>
            </select>
          </div>
        </div>
        
        {/* Clear Filters Button */}
        {(selectedClass || selectedPart || selectedShift || searchTerm) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSelectedClass('');
                setSelectedPart('');
                setSelectedShift('');
                setSearchTerm('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <FiX size={16} />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emergency Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.classId?.className || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.shift}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.emergencyPhone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {isAdmin() && (
                      <>
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(student._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </>
                    )}
                    {isTeacher() && <span className="text-gray-400 text-xs">View Only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="text-center py-8 text-gray-500">No students found</div>
        )}
      </div>

      {/* Modal - Only for Admin */}
      {showModal && isAdmin() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingStudent ? 'Edit Student' : 'Add Student'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  required
                  value={formData.classId}
                  onChange={(e) => {
                    const selectedClass = classes.find(cls => cls._id === e.target.value);
                    const isEnglishClass = selectedClass?.className?.toLowerCase().includes('english');
                    setFormData({ 
                      ...formData, 
                      classId: e.target.value,
                      Parts: isEnglishClass ? formData.Parts : 'None'
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.className}</option>
                  ))}
                </select>
              </div>
              {(() => {
                const selectedClass = classes.find(cls => cls._id === formData.classId);
                const isEnglishClass = selectedClass?.className?.toLowerCase().includes('english');
                return isEnglishClass ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Part</label>
                    <select
                      required
                      value={formData.Parts}
                      onChange={(e) => setFormData({ ...formData, Parts: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="None">None</option>
                      <option value="Part 0">Part 0</option>
                      <option value="Part 1">Part 1</option>
                      <option value="Part 2">Part 2</option>
                      <option value="Part 3">Part 3</option>
                      <option value="Part 4">Part 4</option>
                      <option value="Part 5">Part 5</option>
                      <option value="Part 6">Part 6</option>
                      <option value="Part 7">Part 7</option>
                      <option value="New Top One">New Top One</option>
                      <option value="Top One">Top One</option>
                      <option value="Congratulations">Congratulations</option>
                    </select>
                  </div>
                ) : null;
              })()}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <select
                  required
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Morning">Morning</option>
                  <option value="Noon">Noon</option>
                  <option value="AfterNoon">Afternoon</option>
                  <option value="Night">Night</option>
                  <option value="Khamiis iyo Jimco">Khamiis iyo Jimco</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  required
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingStudent ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress English Parts Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Progress English Parts</h2>
              <button 
                onClick={() => {
                  setShowProgressModal(false);
                  setSelectedParts([]);
                  setProgressMode('all');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-4">
                Choose how you want to progress English students. Some parts may progress monthly, while others take longer.
              </p>

              <div className="space-y-3 mb-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="progressMode"
                    value="all"
                    checked={progressMode === 'all'}
                    onChange={(e) => setProgressMode(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">Progress All English Students</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="progressMode"
                    value="byPart"
                    checked={progressMode === 'byPart'}
                    onChange={(e) => setProgressMode(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">Progress Students by Specific Part(s)</span>
                </label>
              </div>

              {progressMode === 'byPart' && (
                <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-2">Select parts to progress:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {allParts.map(part => (
                      <label key={part} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(part)}
                          onChange={() => togglePartSelection(part)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{part}</span>
                      </label>
                    ))}
                  </div>
                  {selectedParts.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {selectedParts.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleProgressEnglishParts}
                disabled={progressing || (progressMode === 'byPart' && selectedParts.length === 0)}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {progressing ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={20} />
                    Progressing...
                  </>
                ) : (
                  'Progress Students'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProgressModal(false);
                  setSelectedParts([]);
                  setProgressMode('all');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
