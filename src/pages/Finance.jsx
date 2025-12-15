import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiDollarSign, FiArrowUp, FiArrowDown, FiX } from 'react-icons/fi';
import { financeAPI, studentAPI, classAPI } from '../services/api';

const Finance = () => {
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [transactionType, setTransactionType] = useState('income');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    classId: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    amountPaid: '',
    purpose: 'Tuition',
    datePaid: new Date().toISOString().split('T')[0]
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const purposes = ['Tuition', 'Exam', 'Registration', 'Other'];

  useEffect(() => {
    fetchTransactions();
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await financeAPI.getAll();
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await studentAPI.getAll();
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
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

  const handleAdd = (type) => {
    setTransactionType(type);
    setEditingTransaction(null);
    setFormData({
      fullName: '',
      classId: '',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear(),
      amountPaid: '',
      purpose: 'Tuition',
      datePaid: new Date().toISOString().split('T')[0]
    });
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setShowModal(true);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      fullName: transaction.fullName?._id || transaction.fullName || '',
      classId: transaction.classId?._id || transaction.classId || '',
      month: transaction.month || new Date().toLocaleString('default', { month: 'long' }),
      year: transaction.year || new Date().getFullYear(),
      amountPaid: transaction.amountPaid || '',
      purpose: transaction.purpose || 'Tuition',
      datePaid: transaction.datePaid ? new Date(transaction.datePaid).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setSearchQuery(transaction.fullName?.fullName || '');
    setSearchResults([]);
    setHasSearched(false);
    setShowModal(true);
  };

  const handleSearchStudent = async (query) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setSearching(true);
      setHasSearched(true);
      const results = await studentAPI.searchByName(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching students:', err);
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectStudent = (student) => {
    setFormData({
      ...formData,
      fullName: student._id,
      classId: student.classId?._id || ''
    });
    setSearchQuery(student.fullName);
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await financeAPI.delete(id);
        await fetchTransactions();
      } catch (err) {
        alert('Failed to delete transaction: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await financeAPI.update(editingTransaction._id, formData);
      } else {
        await financeAPI.create(formData);
      }
      setShowModal(false);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      await fetchTransactions();
    } catch (err) {
      alert('Failed to save transaction: ' + err.message);
    }
  };

  // Calculate totals
  const totalIncome = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const monthlyFinance = transactions.filter(
    (f) => f.month === currentMonth && f.year === currentYear
  );
  const monthlyIncome = monthlyFinance.reduce((sum, f) => sum + (f.amountPaid || 0), 0);

  // Weekly totals
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = transactions.filter(t => {
    const date = new Date(t.datePaid);
    return date >= weekAgo;
  });
  const weeklyIncome = thisWeek.reduce((sum, t) => sum + (t.amountPaid || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading finance data...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Finance Management</h1>
        <button
          onClick={() => handleAdd('income')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <FiPlus size={20} />
          Add Payment
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-green-600">${totalIncome.toLocaleString()}</p>
            </div>
            <FiArrowUp className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Monthly Income</p>
              <p className="text-2xl font-bold text-blue-600">${monthlyIncome.toLocaleString()}</p>
            </div>
            <FiDollarSign className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Weekly Income</p>
              <p className="text-2xl font-bold text-purple-600">${weeklyIncome.toLocaleString()}</p>
            </div>
            <FiDollarSign className="text-purple-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-gray-800">{transactions.length}</p>
            </div>
            <FiDollarSign className="text-gray-500" size={32} />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.datePaid ? new Date(transaction.datePaid).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.fullName?.fullName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.classId?.className || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.month} {transaction.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.purpose}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ${transaction.amountPaid?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(transaction._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <div className="text-center py-8 text-gray-500">No transactions found</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editingTransaction ? 'Edit Transaction' : 'Add Payment'}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchStudent(e.target.value)}
                    placeholder="Type student name to search..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {searching && (
                  <p className="text-sm text-gray-500 mt-1">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {searchResults.map((student) => (
                      <div
                        key={student._id}
                        onClick={() => handleSelectStudent(student)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{student.fullName}</div>
                        <div className="text-sm text-gray-500">
                          {student.classId?.className || 'No class'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {hasSearched && searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
                  <p className="text-sm text-red-500 mt-1">No student found</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  required
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.fullName}
                >
                  <option value="">{formData.fullName ? 'Select class' : 'Search for a student first'}</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.className}</option>
                  ))}
                </select>
                {formData.fullName && !formData.classId && (
                  <p className="text-sm text-gray-500 mt-1">Class will be auto-filled when you select a student</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  required
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  required
                  min="2020"
                  max="2100"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <select
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {purposes.map((purpose) => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Paid</label>
                <input
                  type="date"
                  required
                  value={formData.datePaid}
                  onChange={(e) => setFormData({ ...formData, datePaid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  {editingTransaction ? 'Update' : 'Add'}
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
    </div>
  );
};

export default Finance;
