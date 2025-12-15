import { useState, useEffect } from 'react';
import { FiFileText, FiCalendar, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { attendanceReportAPI, classAPI } from '../services/api';

const AttendanceReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [classes, setClasses] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  // Auto-fetch report when dates or class changes
  useEffect(() => {
    if (startDate && endDate) {
      handleGenerateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedClass]);

  const fetchClasses = async () => {
    try {
      const data = await classAPI.getAll();
      setClasses(data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setReportData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedClass) params.classId = selectedClass;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await attendanceReportAPI.getDailyReport(params);
      // Handle response format: { success: true, data: [...] } or just array
      let data = response;
      if (response && response.data) {
        data = response.data;
      } else if (response && Array.isArray(response)) {
        data = response;
      }
      console.log('Report data received:', data);
      console.log('Number of attendance records:', Array.isArray(data) ? data.length : 0);
      setReportData(data);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report: ' + err.message);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };


  // Process report data for display
  const processReportData = () => {
    if (!reportData) {
      console.log('No report data available');
      return null;
    }
    
    // Ensure reportData is an array
    const dataArray = Array.isArray(reportData) ? reportData : (reportData.data || []);
    
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      console.log('Report data is empty or not an array:', dataArray);
      return null;
    }
    
    console.log('Processing report data, number of records:', dataArray.length);

    const dailyStats = {};
    const studentStats = {};
    const allStudentRecords = []; // Store all individual student records for detailed view

    dataArray.forEach((attendance) => {
      if (!attendance || !attendance.students || attendance.students.length === 0) {
        console.log('Skipping attendance record with no students:', attendance);
        return;
      }
      const className = attendance.classId?.className || 'Unknown';
      const isEnglishClass = className.toLowerCase().includes('english');
      const date = new Date(attendance.students[0]?.date || attendance.createdAt).toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = { present: 0, absent: 0, total: 0 };
      }

      if (attendance.students) {
        attendance.students.forEach((student) => {
          const studentId = student.studentName?._id || student.studentName;
          const studentName = student.studentName?.fullName || 'Unknown';
          const shift = student.studentName?.shift || 'Unknown';
          const parts = student.studentName?.Parts || 'None';
          const status = student.status || 'Present';

          // Store individual record
          allStudentRecords.push({
            date,
            className,
            studentName,
            shift,
            parts,
            status,
            studentId
          });

          dailyStats[date].total++;
          if (status === 'Present') {
            dailyStats[date].present++;
          } else {
            dailyStats[date].absent++;
          }

          if (!studentStats[studentId]) {
            studentStats[studentId] = { 
              name: studentName, 
              className,
              shift,
              parts,
              present: 0, 
              absent: 0 
            };
          }
          
          if (status === 'Present') {
            studentStats[studentId].present++;
          } else {
            studentStats[studentId].absent++;
          }
        });
      }
    });

    // Apply filters to student records
    let filteredRecords = [...allStudentRecords];
    let filteredStudentStats = { ...studentStats };

    // Filter by class
    if (selectedClass) {
      const selectedClassName = classes.find(c => c._id === selectedClass)?.className || '';
      filteredRecords = filteredRecords.filter(r => r.className === selectedClassName);
      filteredStudentStats = Object.fromEntries(
        Object.entries(filteredStudentStats).filter(([_, stats]) => stats.className === selectedClassName)
      );
    }

    // Filter by shift
    if (selectedShift) {
      filteredRecords = filteredRecords.filter(r => r.shift === selectedShift);
      filteredStudentStats = Object.fromEntries(
        Object.entries(filteredStudentStats).filter(([_, stats]) => stats.shift === selectedShift)
      );
    }

    // Filter by parts (only for English classes)
    if (selectedPart) {
      filteredRecords = filteredRecords.filter(r => r.parts === selectedPart);
      filteredStudentStats = Object.fromEntries(
        Object.entries(filteredStudentStats).filter(([_, stats]) => stats.parts === selectedPart)
      );
    }

    // Filter by status
    if (selectedStatus) {
      filteredRecords = filteredRecords.filter(r => r.status === selectedStatus);
    }

    // Recalculate daily stats based on filtered records
    const filteredDailyStats = {};
    filteredRecords.forEach(record => {
      if (!filteredDailyStats[record.date]) {
        filteredDailyStats[record.date] = { present: 0, absent: 0, total: 0 };
      }
      filteredDailyStats[record.date].total++;
      if (record.status === 'Present') {
        filteredDailyStats[record.date].present++;
      } else {
        filteredDailyStats[record.date].absent++;
      }
    });

    const dailyAttendance = Object.entries(filteredDailyStats).map(([date, stats]) => ({
      date,
      present: stats.present,
      absent: stats.absent,
      percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
    }));

    const studentAttendance = Object.values(filteredStudentStats).map((stats) => {
      const total = stats.present + stats.absent;
      return {
        name: stats.name,
        className: stats.className,
        shift: stats.shift,
        parts: stats.parts,
        present: stats.present,
        absent: stats.absent,
        percentage: total > 0 ? Math.round((stats.present / total) * 100) : 0
      };
    });

    const totalDays = dailyAttendance.length;
    const totalStudents = studentAttendance.length;
    const avgAttendance = studentAttendance.length > 0
      ? Math.round(studentAttendance.reduce((sum, s) => sum + s.percentage, 0) / studentAttendance.length)
      : 0;

    // Separate students into present and absent groups
    const presentStudents = studentAttendance.filter(s => s.present > 0);
    const absentStudents = studentAttendance.filter(s => s.absent > 0);

    return {
      totalDays,
      totalStudents,
      averageAttendance: avgAttendance,
      dailyAttendance,
      studentAttendance,
      allRecords: filteredRecords,
      presentStudents,
      absentStudents
    };
  };

  const processedData = processReportData();
  
  // Check if selected class is English, or if any students in the report are from English classes
  const selectedClassData = classes.find(c => c._id === selectedClass);
  const isSelectedClassEnglish = selectedClassData?.className?.toLowerCase().includes('english') || false;
  const hasEnglishStudents = processedData?.studentAttendance?.some(s => 
    s.className?.toLowerCase().includes('english')
  ) || false;
  const isEnglishClass = isSelectedClassEnglish || hasEnglishStudents;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Attendance Report</h1>

      {/* Date and Class Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Report Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FiCalendar className="inline mr-2" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FiCalendar className="inline mr-2" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedPart(''); // Reset parts filter when class changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((classItem) => (
                <option key={classItem._id} value={classItem._id}>{classItem.className}</option>
              ))}
            </select>
          </div>
        </div>
        {loading && (
          <div className="mt-4 text-center text-blue-600">
            <p>Loading report data...</p>
          </div>
        )}
      </div>

      {/* Filters - Only show when report data is available */}
      {processedData && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
          <div className={`grid grid-cols-1 ${isEnglishClass ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            {/* Shift Filter */}
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
                  <option value="Congratulations">Congratulations</option>
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Excused">Excused</option>
              </select>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(selectedShift || selectedPart || selectedStatus) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSelectedShift('');
                  setSelectedPart('');
                  setSelectedStatus('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Report Summary */}
      {processedData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Total Days</p>
              <p className="text-2xl font-bold text-gray-800">{processedData.totalDays}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-2xl font-bold text-gray-800">{processedData.totalStudents}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Present Students</p>
                  <p className="text-2xl font-bold text-green-600">{processedData.presentStudents.length}</p>
                </div>
                <FiCheckCircle className="text-green-500" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Absent Students</p>
                  <p className="text-2xl font-bold text-red-600">{processedData.absentStudents.length}</p>
                </div>
                <FiXCircle className="text-red-500" size={32} />
              </div>
            </div>
          </div>

          {/* Daily Attendance Table */}
          {processedData.dailyAttendance.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Attendance Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Present</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Absent</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedData.dailyAttendance.map((day, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{day.present}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{day.absent}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${day.percentage}%` }}
                              />
                            </div>
                            <span>{day.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Present Students Section */}
          {processedData.presentStudents.length > 0 && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FiCheckCircle className="text-green-600" size={24} />
                  Present Students ({processedData.presentStudents.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Student Name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Shift</th>
                      {isEnglishClass && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Part</th>
                      )}
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Present Days</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Absent Days</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedData.presentStudents.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.className}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.shift}</td>
                          {isEnglishClass && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.parts || 'None'}</td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{student.present}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{student.absent}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    student.percentage >= 90 ? 'bg-green-600' :
                                    student.percentage >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                                  }`}
                                  style={{ width: `${student.percentage}%` }}
                                />
                              </div>
                              <span>{student.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Absent Students Section */}
          {processedData.absentStudents.length > 0 && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FiXCircle className="text-red-600" size={24} />
                  Absent Students ({processedData.absentStudents.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Student Name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Shift</th>
                      {isEnglishClass && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Part</th>
                      )}
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Present Days</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Absent Days</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedData.absentStudents.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.className}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.shift}</td>
                          {isEnglishClass && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.parts || 'None'}</td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{student.present}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{student.absent}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    student.percentage >= 90 ? 'bg-green-600' :
                                    student.percentage >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                                  }`}
                                  style={{ width: `${student.percentage}%` }}
                                />
                              </div>
                              <span>{student.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {processedData.presentStudents.length === 0 && processedData.absentStudents.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <FiFileText className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">No student attendance data found for the selected criteria</p>
            </div>
          )}
        </div>
      )}

      {!processedData && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiFileText className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Select date range and class, then generate report</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
