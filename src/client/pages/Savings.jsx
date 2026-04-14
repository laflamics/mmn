import { useEffect, useState } from 'react';
import { formatDate, formatCurrency } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import FilterBar from '../components/FilterBar';
import Table from '../components/Table';

export default function Savings() {
  const [savingsData, setSavingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalSavings, setTotalSavings] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, startDate, endDate, pageSize]);

  useEffect(() => {
    fetchSavingsData(currentPage);
  }, [currentPage, searchTerm, dateFilter, startDate, endDate, pageSize]);

  const fetchSavingsData = async (page) => {
    try {
      setLoading(true);
      let query = supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          order_date,
          saving_amount,
          total_amount,
          status,
          customer_id,
          customers(id, name)
        `, { count: 'exact' })
        .gt('saving_amount', 0);

      // Apply date filter
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      if (dateFilter === 'this_month') {
        query = query.gte('order_date', currentMonth.toISOString().split('T')[0]);
      } else if (dateFilter === 'last_month') {
        query = query.gte('order_date', lastMonthStart.toISOString().split('T')[0])
                     .lte('order_date', lastMonthEnd.toISOString().split('T')[0]);
      } else if (dateFilter === 'custom' && startDate && endDate) {
        query = query.gte('order_date', startDate)
                     .lte('order_date', endDate);
      }

      const { data: allOrders, error: err, count } = await query
        .order('order_date', { ascending: false });

      if (err) throw err;

      // Client-side filtering for search
      let filtered = allOrders;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(order => 
          order.order_number?.toLowerCase().includes(term) ||
          order.customers?.name?.toLowerCase().includes(term)
        );
      }

      // Calculate total savings
      const total = filtered.reduce((sum, order) => sum + (order.saving_amount || 0), 0);
      setTotalSavings(total);

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const paginatedData = filtered.slice(from, to + 1);

      setSavingsData(paginatedData);
      setTotalCount(filtered.length);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching savings data:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'order_number',
      label: 'Order Number',
      render: (value) => <span className="font-medium text-white">{value}</span>
    },
    {
      key: 'customers',
      label: 'Customer',
      render: (value) => <span className="text-slate-300">{value?.name || '-'}</span>
    },
    {
      key: 'order_date',
      label: 'Date',
      render: (value) => <span className="text-slate-400">{formatDate(value)}</span>
    },
    {
      key: 'saving_amount',
      label: 'Saving Amount',
      render: (value) => <span className="font-semibold text-green-400">{formatCurrency(value)}</span>
    },
    {
      key: 'total_amount',
      label: 'Order Total',
      render: (value) => <span className="text-slate-300">{formatCurrency(value)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value === 'completed' ? 'bg-green-500/20 text-green-300' :
          value === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
          value === 'cancelled' ? 'bg-red-500/20 text-red-300' :
          'bg-slate-500/20 text-slate-300'
        }`}>
          {value}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings Summary</h1>
          <p className="text-slate-400 text-sm mt-1">Track all savings added to sales orders</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Total Savings</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalSavings)}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Total Orders with Savings</p>
          <p className="text-2xl font-bold text-blue-400">{totalCount}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Average Saving per Order</p>
          <p className="text-2xl font-bold text-purple-400">
            {totalCount > 0 ? formatCurrency(totalSavings / totalCount) : formatCurrency(0)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        placeholder="Search by order number or customer name..."
      />

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/20 text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <Table
          columns={columns}
          data={savingsData}
          loading={loading}
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setCurrentPage}
          emptyMessage="No savings records found"
        />
      </div>
    </div>
  );
}
