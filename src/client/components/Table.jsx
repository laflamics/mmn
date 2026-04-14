import { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Table({ columns, data, rowsPerPage = 20 }) {
  const { currentTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);

  const getHeaderTextColor = () => currentTheme.id === 'light' ? 'text-gray-700' : 'text-slate-300';
  const getRowTextColor = () => currentTheme.id === 'light' ? 'text-gray-900' : 'text-slate-200';
  const getEmptyTextColor = () => currentTheme.id === 'light' ? 'text-gray-500' : 'text-slate-400';
  const getBorderColor = () => currentTheme.id === 'light' ? 'border-gray-300' : 'border-slate-700';
  const getHoverBg = () => currentTheme.id === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/5';
  const getHeaderBg = () => currentTheme.id === 'light' ? 'bg-gray-200' : 'bg-white/5';

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const handleFirst = () => setCurrentPage(1);
  const handlePrevious = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNext = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));
  const handleLast = () => setCurrentPage(totalPages);

  return (
    <div className="space-y-4">
      {/* Table - Scrollable on mobile */}
      <div className="glass rounded-lg md:rounded-xl overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className={`${getHeaderBg()} border-b ${getBorderColor()} sticky top-0`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-1 sm:px-2 md:px-3 lg:px-4 py-1 sm:py-1.5 md:py-2 lg:py-3 text-left text-xs sm:text-xs md:text-sm lg:text-base font-semibold ${getHeaderTextColor()} whitespace-nowrap`}
                  style={{ minWidth: col.width || 'auto' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row, idx) => (
                <tr key={idx} className={`border-b ${getBorderColor()} ${getHoverBg()} transition-colors`}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm ${getRowTextColor()} whitespace-nowrap`}
                      style={{ minWidth: col.width || 'auto' }}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={`px-1 sm:px-2 md:px-3 lg:px-4 py-4 sm:py-6 md:py-8 lg:py-12 text-center text-xs sm:text-xs md:text-sm lg:text-base ${getEmptyTextColor()}`}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-1 sm:gap-2 md:gap-3 glass rounded-lg md:rounded-xl p-1.5 sm:p-2 md:p-3 lg:p-4">
          <div className={`text-xs sm:text-xs md:text-sm lg:text-base ${currentTheme.id === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
            {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length}
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button
              onClick={handleFirst}
              disabled={currentPage === 1}
              className={`px-1 sm:px-1.5 md:px-2 lg:px-3 py-0.5 sm:py-1 md:py-1 lg:py-1 glass-sm rounded text-xs sm:text-xs md:text-xs lg:text-sm ${currentTheme.id === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-slate-300 hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium`}
              title="First"
            >
              ⏮
            </button>
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className={`px-1 sm:px-1.5 md:px-2 lg:px-3 py-0.5 sm:py-1 md:py-1 lg:py-1 glass-sm rounded text-xs sm:text-xs md:text-xs lg:text-sm ${currentTheme.id === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-slate-300 hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium`}
              title="Previous"
            >
              ◀
            </button>

            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return page;
              }).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-1 sm:px-1.5 md:px-2 lg:px-2 py-0.5 sm:py-1 md:py-1 lg:py-1 rounded text-xs sm:text-xs md:text-xs lg:text-sm font-medium transition-smooth ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : currentTheme.id === 'light' ? 'glass-sm text-gray-700 hover:text-gray-900' : 'glass-sm text-slate-300 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className={`px-1.5 md:px-3 py-1 glass-sm rounded text-xs md:text-sm ${currentTheme.id === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-slate-300 hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium`}
              title="Next"
            >
              ▶
            </button>
            <button
              onClick={handleLast}
              disabled={currentPage === totalPages}
              className={`px-1.5 md:px-3 py-1 glass-sm rounded text-xs md:text-sm ${currentTheme.id === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-slate-300 hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium`}
              title="Last"
            >
              ⏭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
