import { useState, useEffect } from 'react';
import { FiCheck, FiX as FiXIcon } from 'react-icons/fi';
import { attendanceAPI, classAPI, studentAPI, teacherAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Attendance = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // Store all students for filtering
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const { user, isAdmin, isTeacher } = useAuth();

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    
    // Auto-select class and teacher for teachers
    if (isTeacher() && user?.classId) {
      setSelectedClass(user.classId);
      // Use teacherId (from teacher collection) not user.id
      if (user.teacherId) {
        setSelectedTeacher(user.teacherId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsForClass();
      checkExistingAttendance();
      // Reset filters when class changes
      setSelectedShift('');
      setSelectedPart('');
    }
  }, [selectedClass, attendanceDate]);

  const fetchClasses = async () => {
    try {
      const data = await classAPI.getAll();
      // Filter classes for teachers - only show their assigned class
      if (isTeacher() && user?.classId) {
        const filtered = data.filter(c => c._id === user.classId);
        setClasses(filtered);
      } else {
        setClasses(data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await teacherAPI.getAll();
      setTeachers(data);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const fetchStudentsForClass = async () => {
    try {
      const data = await studentAPI.getAll();
      const classStudents = data.filter(s => 
        s.classId?._id === selectedClass || s.classId === selectedClass
      );
      setAllStudents(classStudents); // Store all students
      
      // Initialize attendance state
      const initialAttendance = {};
      classStudents.forEach(student => {
        initialAttendance[student._id] = 'Present';
      });
      setAttendance(initialAttendance);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  // Apply filters to students whenever filters or allStudents change
  useEffect(() => {
    if (allStudents.length > 0) {
      let filtered = [...allStudents];
      
      // Filter by shift
      if (selectedShift) {
        filtered = filtered.filter(student => student.shift === selectedShift);
      }
      
      // Filter by parts (only for English classes)
      if (selectedPart) {
        filtered = filtered.filter(student => student.Parts === selectedPart);
      }
      
      setStudents(filtered);
    }
  }, [allStudents, selectedShift, selectedPart]);

  const checkExistingAttendance = async () => {
    if (!selectedClass || !attendanceDate) return;
    
    try {
      setLoading(true);
      const existing = await attendanceAPI.getByClass(selectedClass, attendanceDate);
      if (existing && existing.students) {
        const attendanceMap = {};
        existing.students.forEach(student => {
          if (student.studentName?._id) {
            attendanceMap[student.studentName._id] = student.status || 'Present';
          }
        });
        setAttendance(attendanceMap);
        if (existing.teacherName?._id) {
          setSelectedTeacher(existing.teacherName._id);
        }
      }
    } catch (err) {
      // No existing attendance found, that's okay
      console.log('No existing attendance found');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (classId) => {
    setSelectedClass(classId);
    setAttendance({});
    setSubmitted(false);
    setSelectedShift('');
    setSelectedPart('');
    
    // Auto-select the teacher assigned to this class (for admins)
    if (isAdmin()) {
      const assignedTeacher = teachers.find(t => 
        t.classId?._id === classId || t.classId === classId
      );
      if (assignedTeacher) {
        setSelectedTeacher(assignedTeacher._id);
      } else {
        setSelectedTeacher('');
      }
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const markAllPresent = () => {
    setAttendance(prev => {
      const updated = { ...prev };
      students.forEach(student => {
        updated[student._id] = 'Present';
      });
      return updated;
    });
  };

  const markAllAbsent = () => {
    setAttendance(prev => {
      const updated = { ...prev };
      students.forEach(student => {
        updated[student._id] = 'Absent';
      });
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!selectedClass || !selectedTeacher) {
      alert('Please select both class and teacher');
      return;
    }

    // Verify that the selected teacher is assigned to the selected class
    const assignedTeacher = teachers.find(t => 
      (t.classId?._id === selectedClass || t.classId === selectedClass) && 
      (t._id === selectedTeacher)
    );
    
    if (!assignedTeacher) {
      alert('Only the teacher assigned to this class can take attendance');
      return;
    }

    // For teachers, ensure they can only submit attendance for their assigned class
    if (isTeacher() && user?.classId && selectedClass !== user.classId) {
      alert('You can only mark attendance for your assigned class');
      return;
    }

    // For teachers, ensure they can only submit attendance as themselves
    if (isTeacher() && user?.teacherId && selectedTeacher !== user.teacherId) {
      alert('You can only mark attendance as yourself');
      return;
    }

    if (Object.keys(attendance).length === 0) {
      alert('Please mark attendance for at least one student');
      return;
    }

    try {
      setLoading(true);
      
      // Ensure ALL students in the class are included in the submission
      // Use their status from attendance state, or default to 'Absent' if not marked
      const studentsArray = allStudents.map(student => {
        const status = attendance[student._id] || 'Absent'; // Default to Absent if not marked
        // The shift field in the model expects an ObjectId reference to students
        // So we use the student ID for shift as well (as per the model schema)
        return {
          studentName: student._id,
          shift: student.shift, // Shift is an ObjectId reference to students in the model
          status: status,
          date: new Date(attendanceDate) // Convert to Date object
        };
      });

      const payload = {
        classId: selectedClass,
        teacherName: selectedTeacher,
        students: studentsArray
      };

      console.log('Submitting attendance:', payload);
      console.log(`Submitting ${studentsArray.length} students (${studentsArray.filter(s => s.status === 'Present').length} Present, ${studentsArray.filter(s => s.status === 'Absent').length} Absent)`);
      await attendanceAPI.create(payload);

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error('Attendance submission error:', err);
      const errorMessage = err.message || 'Failed to submit attendance. Please check the console for details.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = Object.values(attendance).filter(status => status === 'Present').length;
  const absentCount = Object.values(attendance).filter(status => status === 'Absent').length;

  // Get teacher for selected class
  const classTeacher = teachers.find(t => 
    t.classId?._id === selectedClass || t.classId === selectedClass
  );

  // Check if selected class is English
  const selectedClassData = classes.find(c => c._id === selectedClass);
  const isEnglishClass = selectedClassData?.className?.toLowerCase().includes('english');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mark Attendance</h1>

      {/* Class Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
            {isTeacher() ? (
              <input
                type="text"
                value={classes.find(c => c._id === selectedClass)?.className || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            ) : (
              <select
                value={selectedClass}
                onChange={(e) => handleClassSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a class...</option>
                {classes.map((classItem) => (
                  <option key={classItem._id} value={classItem._id}>{classItem.className}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
            {isTeacher() ? (
              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            ) : (
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={selectedClass && !classTeacher}
              >
                <option value="">Select teacher...</option>
                {classTeacher ? (
                  <option value={classTeacher._id}>{classTeacher.fullName}</option>
                ) : selectedClass ? (
                  <option value="" disabled>No teacher assigned to this class</option>
                ) : null}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      {selectedClass && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
          <div className={`grid grid-cols-1 ${isEnglishClass ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
            {/* Shift Filter - Available for all classes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Shift</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Shifts</option>
                <option value="Morning">Morning</option>
                <option value="Noon">Noon</option>
                <option value="AfterNoon">Afternoon</option>
                <option value="Night">Night</option>
                <option value="Khamiis iyo Jimco">Khamiis iyo Jimco</option>
              </select>
            </div>
            
            {/* Parts Filter - Only show if class is English */}
            {isEnglishClass && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Part</label>
                <select
                  value={selectedPart}
                  onChange={(e) => setSelectedPart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Parts</option>
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
            )}
          </div>
          
          {/* Clear Filters Button */}
          {(selectedShift || selectedPart) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSelectedShift('');
                  setSelectedPart('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Attendance Marking */}
      {selectedClass && students.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {classes.find(c => c._id === selectedClass)?.className} - Attendance
            </h2>
            <div className="flex gap-2">
              <button
                onClick={markAllPresent}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
              >
                Mark All Present
              </button>
              <button
                onClick={markAllAbsent}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-blue-600">{students.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
          </div>

          {/* Students List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                {students.map((student) => {
                  const status = attendance[student._id] || 'unmarked';
                  return (
                    <div
                      key={student._id}
                      className={`
                        flex items-center justify-between p-4 rounded-lg border-2 transition-colors
                        ${status === 'Present' ? 'bg-green-50 border-green-300' : 
                          status === 'Absent' ? 'bg-red-50 border-red-300' : 
                          'bg-gray-50 border-gray-200'}
                      `}
                    >
                      <span className="font-medium text-gray-800">{student.fullName}</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`attendance-${student._id}`}
                            checked={status === 'Present'}
                            onChange={() => {
                              if (status !== 'Present') {
                                toggleAttendance(student._id);
                              }
                            }}
                            className="w-5 h-5 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-green-700">Present</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`attendance-${student._id}`}
                            checked={status === 'Absent'}
                            onChange={() => {
                              if (status !== 'Absent') {
                                toggleAttendance(student._id);
                              }
                            }}
                            className="w-5 h-5 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm font-medium text-red-700">Absent</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitted || loading}
                className={`
                  w-full py-3 rounded-lg font-semibold transition-colors
                  ${submitted 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'}
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {loading ? 'Submitting...' : submitted ? '✓ Attendance Submitted Successfully!' : 'Submit Attendance'}
              </button>
            </>
          )}
        </div>
      )}

      {selectedClass && students.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500">No students found in this class.</p>
        </div>
      )}

      {!selectedClass && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500">Please select a class to mark attendance.</p>
        </div>
      )}
    </div>
  );
};

export default Attendance;
