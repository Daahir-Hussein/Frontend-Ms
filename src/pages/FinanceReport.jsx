import { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FiDownload, FiPrinter, FiCalendar, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { financeReportAPI } from '../services/api';

const FinanceReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState(null);
  const [chartType, setChartType] = useState('bar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatusData, setPaymentStatusData] = useState(null);
  const [loadingPaymentStatus, setLoadingPaymentStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('report');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (selectedMonth && selectedYear) {
        const data = await financeReportAPI.getSpecificMonthReport({
          month: selectedMonth,
          year: selectedYear
        });
        setReportData(processFinanceData(data));
      } else {
        const data = await financeReportAPI.getMonthlyReport({
          year: selectedYear
        });
        setReportData(processMonthlyData(data));
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const processFinanceData = (data) => {
    if (!Array.isArray(data)) return null;

    const incomeByPurpose = {};
    const totalIncome = data.reduce((sum, item) => {
      const purpose = item.purpose || 'Other';
      incomeByPurpose[purpose] = (incomeByPurpose[purpose] || 0) + (item.amountPaid || 0);
      return sum + (item.amountPaid || 0);
    }, 0);

    const income = Object.entries(incomeByPurpose).map(([name, amount]) => ({
      name,
      amount
    }));

    return {
      income,
      expenses: [],
      monthly: [],
      totalIncome,
      totalExpenses: 0,
      netBalance: totalIncome
    };
  };

  const processMonthlyData = (data) => {
    if (!Array.isArray(data)) return null;

    const monthly = data.map(item => ({
      month: item._id?.month || 'Unknown',
      year: item._id?.year || new Date().getFullYear(),
      income: item.totalAmount || 0,
      expenses: 0
    }));

    const totalIncome = monthly.reduce((sum, m) => sum + m.income, 0);

    return {
      income: [],
      expenses: [],
      monthly,
      totalIncome,
      totalExpenses: 0,
      netBalance: totalIncome
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    alert('PDF export functionality would be implemented here');
  };

  const handleExportExcel = () => {
    alert('Excel export functionality would be implemented here');
  };

  const handleLoadPaymentStatus = async () => {
    try {
      setLoadingPaymentStatus(true);
      setError(null);
      
      const params = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      
      const data = await financeReportAPI.getStudentsPaymentStatus(params);
      setPaymentStatusData(data);
    } catch (err) {
      console.error('Error loading payment status:', err);
      setError('Failed to load payment status: ' + err.message);
    } finally {
      setLoadingPaymentStatus(false);
    }
  };

  const totalIncome = reportData?.totalIncome || 0;
  const totalExpenses = reportData?.totalExpenses || 0;
  const netBalance = reportData?.netBalance || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Finance Report</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-6 py-2 font-medium ${
              activeTab === 'report'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Financial Reports
          </button>
          <button
            onClick={() => {
              setActiveTab('payment');
              if (!paymentStatusData) {
                handleLoadPaymentStatus();
              }
            }}
            className={`px-6 py-2 font-medium ${
              activeTab === 'payment'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Payment Status
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPaymentStatusData(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Months</option>
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setPaymentStatusData(null);
              }}
              min="2020"
              max="2100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            {activeTab === 'report' ? (
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            ) : (
              <button
                onClick={handleLoadPaymentStatus}
                disabled={loadingPaymentStatus}
                className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loadingPaymentStatus ? 'Loading...' : 'Load Payment Status'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
          {error}
        </div>
      )}

      {reportData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Total Income</p>
              <p className="text-3xl font-bold text-green-600">${totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-red-600">${totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Net Balance</p>
              <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ${netBalance.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Export Buttons */}
          {/* <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePrint}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <FiPrinter size={18} />
                Print
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <FiDownload size={18} />
                Export PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <FiDownload size={18} />
                Export Excel
              </button>
            </div>
          </div> */}

          {/* Chart Type Selector */}
          {reportData.income.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-4 py-2 rounded-lg ${
                    chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Bar Chart
                </button>
                <button
                  onClick={() => setChartType('pie')}
                  className={`px-4 py-2 rounded-lg ${
                    chartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Pie Chart
                </button>
              </div>
            </div>
          )}

          {/* Income Chart */}
          {reportData.income.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Income Breakdown</h2>
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'bar' ? (
                  <BarChart data={reportData.income}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="amount" fill="#10B981" />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={reportData.income}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {reportData.income.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly Trend */}
          {reportData.monthly.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Income Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#10B981" name="Income" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Tables */}
          {reportData.income.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Income Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.income.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-600">
                          ${item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!reportData && !loading && activeTab === 'report' && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiCalendar className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Select month/year and generate report to view charts and statistics</p>
        </div>
      )}

      {/* Payment Status Tab */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          {loadingPaymentStatus && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">Loading payment status...</p>
            </div>
          )}

          {paymentStatusData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-sm text-gray-600 mb-1">Total Students</p>
                  <p className="text-3xl font-bold text-gray-800">{paymentStatusData.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Paid Students</p>
                      <p className="text-3xl font-bold text-green-600">{paymentStatusData.paid}</p>
                    </div>
                    <FiCheckCircle className="text-green-500" size={32} />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Unpaid Students</p>
                      <p className="text-3xl font-bold text-red-600">{paymentStatusData.unpaid}</p>
                    </div>
                    <FiXCircle className="text-red-500" size={32} />
                  </div>
                </div>
              </div>

              {/* Filter Info */}
              {paymentStatusData.filter !== 'all' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    Showing payment status for: <strong>{paymentStatusData.filter.month} {paymentStatusData.filter.year}</strong>
                  </p>
                </div>
              )}

              {/* Paid Students Table */}
              {paymentStatusData.students.paid.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FiCheckCircle className="text-green-600" size={24} />
                      Paid Students ({paymentStatusData.students.paid.length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Student Name</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Class</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Shift</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Payments</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Total Paid</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentStatusData.students.paid.map((student) => {
                          const totalPaid = student.financeRecords.reduce((sum, record) => sum + record.amountPaid, 0);
                          return (
                            <tr key={student._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {student.fullName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {student.classId?.className || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {student.shift}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {student.financeRecords.map((record, idx) => (
                                  <div key={idx} className="text-xs">
                                    {record.month} {record.year}: ${record.amountPaid?.toLocaleString()} ({record.purpose})
                                  </div>
                                ))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                ${totalPaid.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unpaid Students Table */}
              {paymentStatusData.students.unpaid.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FiXCircle className="text-red-600" size={24} />
                      Unpaid Students ({paymentStatusData.students.unpaid.length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Student Name</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Class</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Shift</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentStatusData.students.unpaid.map((student) => (
                          <tr key={student._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student.fullName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.classId?.className || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.shift}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.phone}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {paymentStatusData.students.paid.length === 0 && paymentStatusData.students.unpaid.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <p className="text-gray-500">No students found</p>
                </div>
              )}
            </>
          )}

          {!paymentStatusData && !loadingPaymentStatus && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <FiCalendar className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">Click "Load Payment Status" to view paid and unpaid students</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinanceReport;
