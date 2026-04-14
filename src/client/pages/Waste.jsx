import { useState } from 'react';
import { formatDate, formatCurrency } from '../lib/formatters';
import Dialog from '../components/Dialog';
import FilterBar from '../components/FilterBar';

export default function Waste() {
  const [waste, setWaste] = useState([]);
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
        <h1 className="text-4xl font-bold gradient-text">Waste Management</h1>
        <button 
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Record Waste
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
        searchPlaceholder="Product or Category"
      />

      <Dialog
        isOpen={showDialog}
        title="Record Waste Item"
        onClose={() => setShowDialog(false)}
        onSubmit={() => setShowDialog(false)}
        submitLabel="Record Waste"
      >
        <div className="space-y-4">
          <input
            type="date"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="Product"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            placeholder="Quantity"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            placeholder="Value"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            step="0.01"
          />
          <select className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option className="bg-slate-800">Damaged</option>
            <option className="bg-slate-800">Expired</option>
            <option className="bg-slate-800">Defective</option>
            <option className="bg-slate-800">Other</option>
          </select>
        </div>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass rounded-xl p-6">
          <p className="text-slate-400 text-sm font-medium">Total Waste Items</p>
          <p className="text-3xl font-bold text-white mt-2">{waste.length}</p>
        </div>
        <div className="glass rounded-xl p-6">
          <p className="text-slate-400 text-sm font-medium">Total Waste Value</p>
          <p className="text-3xl font-bold text-red-400 mt-2">Rp 0</p>
        </div>
        <div className="glass rounded-xl p-6">
          <p className="text-slate-400 text-sm font-medium">This Month</p>
          <p className="text-3xl font-bold text-orange-400 mt-2">0 items</p>
        </div>
      </div>

      {waste.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-slate-400 text-lg">No waste records yet</p>
          <p className="text-slate-500 text-sm mt-2">Record waste items to track disposal</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Quantity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Value</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Reason</th>
              </tr>
            </thead>
            <tbody>
              {waste.map((item) => (
                <tr key={item.id} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(item.date)}</td>
                  <td className="px-6 py-4 text-sm text-slate-200">{item.product_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-200">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-red-400">{formatCurrency(item.value)}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
