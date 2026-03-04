import { useEffect, useState } from 'react';
import { getARAgingReport, getAPAgingReport } from '../lib/api';
import Table from '../components/Table';

export default function Reports() {
  const [arAging, setArAging] = useState([]);
  const [apAging, setApAging] = useState([]);
  const [activeTab, setActiveTab] = useState('ar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [arRes, apRes] = await Promise.all([
        getARAgingReport(),
        getAPAgingReport(),
      ]);
      setArAging(arRes);
      setApAging(apRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (data, filename) => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const arColumns = [
    { key: 'name', label: 'Customer', width: '18%' },
    { key: 'invoice_number', label: 'Invoice #', width: '12%' },
    { 
      key: 'invoice_date', 
      label: 'Invoice Date', 
      width: '15%',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { 
      key: 'due_date', 
      label: 'Due Date', 
      width: '15%',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { key: 'outstanding', label: 'Outstanding', width: '15%', render: (val) => `$${val}` },
    { 
      key: 'days_overdue', 
      label: 'Days Overdue', 
      width: '15%',
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${val > 0 ? 'bg-red-500/30 text-red-200' : 'bg-green-500/30 text-green-200'}`}>
          {val > 0 ? `${val} days` : 'On time'}
        </span>
      )
    },
  ];

  const apColumns = [
    { key: 'name', label: 'Supplier', width: '25%' },
    { key: 'po_number', label: 'PO #', width: '20%' },
    { 
      key: 'order_date', 
      label: 'Order Date', 
      width: '25%',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { key: 'outstanding', label: 'Outstanding', width: '25%', render: (val) => `$${val}` },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Reports</h1>
        <button
          onClick={() => exportToExcel(activeTab === 'ar' ? arAging : apAging, `${activeTab}-report.csv`)}
          className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium"
        >
          ⬇ Export CSV
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab('ar')}
          className={`px-6 py-2 rounded-lg font-semibold transition-smooth ${
            activeTab === 'ar'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : 'glass text-slate-300 hover:text-white'
          }`}
        >
          AR Aging
        </button>
        <button
          onClick={() => setActiveTab('ap')}
          className={`px-6 py-2 rounded-lg font-semibold transition-smooth ${
            activeTab === 'ap'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : 'glass text-slate-300 hover:text-white'
          }`}
        >
          AP Aging
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === 'ar' ? (
            <Table columns={arColumns} data={arAging} rowsPerPage={20} />
          ) : (
            <Table columns={apColumns} data={apAging} rowsPerPage={20} />
          )}
        </>
      )}
    </div>
  );
}
