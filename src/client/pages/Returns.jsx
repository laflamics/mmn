import { useState } from 'react';
import { formatDate, formatCurrency } from '../lib/formatters';
import Dialog from '../components/Dialog';
import FilterBar from '../components/FilterBar';
import NumberInput from '../components/NumberInput';

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Returns Management</h1>
        <button 
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Create Return
        </button>
      </div>

      <FilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customerTypeFilter={customerTypeFilter}
        setCustomerTypeFilter={setCustomerTypeFilter}
        pageSize={pageSize}
        setPageSize={setPageSize}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchPlaceholder="Return # or Customer"
      />

      <Dialog
        isOpen={showDialog}
        title="Create New Return"
        onClose={() => setShowDialog(false)}
        onSubmit={() => setShowDialog(false)}
        submitLabel="Create Return"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Customer"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="Invoice / Order #"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="date"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <NumberInput
            placeholder="Amount"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            allowDecimal={true}
          />
          <textarea
            placeholder="Reason for return"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            rows="3"
          />
        </div>
      </Dialog>

      {returns.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-slate-400 text-lg">No returns yet</p>
          <p className="text-slate-500 text-sm mt-2">Create a return to get started</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Return #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Customer</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((ret) => (
                <tr key={ret.id} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-200">{ret.return_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{ret.customer_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(ret.date)}</td>
                  <td className="px-6 py-4 text-sm text-slate-200">{formatCurrency(ret.amount)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200">
                      {ret.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
