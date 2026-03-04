import { useEffect, useState } from 'react';
import { getAPAgingReport } from '../lib/api';

export default function APaging() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const result = await getAPAgingReport();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ap-aging-report.csv';
    a.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">AP Aging Report</h1>
        <button
          onClick={exportToCSV}
          className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium"
        >
          ⬇ Export CSV
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Supplier</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">PO #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Order Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Total Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Paid Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-200">{row.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{row.po_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{new Date(row.order_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-200">${row.total_amount}</td>
                  <td className="px-6 py-4 text-sm text-green-400">${row.paid_amount}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-orange-400">${row.outstanding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
