export default function FilterBar({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  customerTypeFilter,
  setCustomerTypeFilter,
  pageSize,
  setPageSize,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  searchPlaceholder = "Search...",
  showCustomerTypeFilter = false
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6 space-y-4">
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${showCustomerTypeFilter ? '5' : '4'} gap-3`}>
        {/* Search */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Search</label>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Date</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          >
            <option className="bg-slate-800" value="all">All Time</option>
            <option className="bg-slate-800" value="this_month">This Month</option>
            <option className="bg-slate-800" value="last_month">Last Month</option>
            <option className="bg-slate-800" value="custom">Custom Range</option>
          </select>
        </div>

        {/* Customer Type - Optional */}
        {showCustomerTypeFilter && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Type</label>
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className="w-full px-3 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              <option className="bg-slate-800" value="all">All</option>
              <option className="bg-slate-800" value="B2B">B2B</option>
              <option className="bg-slate-800" value="B2C">B2C</option>
            </select>
          </div>
        )}

        {/* Page Size */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Per Page</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="w-full px-3 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          >
            <option className="bg-slate-800" value="10">10</option>
            <option className="bg-slate-800" value="20">20</option>
            <option className="bg-slate-800" value="50">50</option>
            <option className="bg-slate-800" value="100">100</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range */}
      {dateFilter === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
