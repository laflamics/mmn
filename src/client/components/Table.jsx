import { useState, useMemo } from 'react';

export default function Table({ columns, data, rowsPerPage = 20 }) {
  const [currentPage, setCurrentPage] = useState(1);

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
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-slate-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-sm font-semibold text-slate-300"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4 text-sm text-slate-200"
                      style={{ width: col.width }}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between glass rounded-xl p-4">
          <div className="text-sm text-slate-400">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleFirst}
              disabled={currentPage === 1}
              className="px-3 py-1 glass-sm rounded-lg text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium text-sm"
            >
              ⏮ First
            </button>
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className="px-3 py-1 glass-sm rounded-lg text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium text-sm"
            >
              ◀ Previous
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg font-medium text-sm transition-smooth ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'glass-sm text-slate-300 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="px-3 py-1 glass-sm rounded-lg text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium text-sm"
            >
              Next ▶
            </button>
            <button
              onClick={handleLast}
              disabled={currentPage === totalPages}
              className="px-3 py-1 glass-sm rounded-lg text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium text-sm"
            >
              Last ⏭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
