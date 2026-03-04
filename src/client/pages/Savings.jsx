import { useEffect, useState } from 'react';
import { getCustomers } from '../lib/api';
import Table from '../components/Table';

export default function Savings() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalSavings = customers.reduce((sum, c) => sum + (c.plafond_limit || 0), 0);
  const totalUsed = customers.reduce((sum, c) => sum + (c.plafond_used || 0), 0);

  const columns = [
    { key: 'name', label: 'Customer', width: '20%' },
    { 
      key: 'type', 
      label: 'Type', 
      width: '10%',
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${val === 'B2B' ? 'bg-blue-500/30 text-blue-200' : 'bg-green-500/30 text-green-200'}`}>
          {val}
        </span>
      )
    },
    { key: 'plafond_limit', label: 'Plafond Limit', width: '15%', render: (val) => `$${val}` },
    { key: 'plafond_used', label: 'Used', width: '15%', render: (val) => `$${val}` },
    { 
      key: 'remaining', 
      label: 'Remaining', 
      width: '15%',
      render: (_, row) => `$${(row.plafond_limit - row.plafond_used).toFixed(2)}`
    },
    { 
      key: 'usage', 
      label: 'Usage %', 
      width: '15%',
      render: (_, row) => {
        const usage = row.plafond_limit ? (row.plafond_used / row.plafond_limit * 100).toFixed(1) : 0;
        return (
          <div className="flex items-center space-x-2">
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-orange-500 transition-all"
                style={{ width: `${usage}%` }}
              ></div>
            </div>
            <span className="text-slate-300 text-xs">{usage}%</span>
          </div>
        );
      }
    },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold gradient-text mb-8">Customer Savings Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass rounded-xl p-6">
          <p className="text-slate-400 text-sm font-medium">Total Plafond</p>
          <p className="text-3xl font-bold text-white mt-2">${totalSavings.toFixed(2)}</p>
        </div>
        <div className="glass rounded-xl p-6">
          <p className="text-slate-400 text-sm font-medium">Total Used</p>
          <p className="text-3xl font-bold text-orange-400 mt-2">${totalUsed.toFixed(2)}</p>
        </div>
        <div className="glass rounded-xl p-6">
          <p className="text-slate-400 text-sm font-medium">Total Remaining</p>
          <p className="text-3xl font-bold text-green-400 mt-2">${(totalSavings - totalUsed).toFixed(2)}</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <Table columns={columns} data={customers} rowsPerPage={20} />
      )}
    </div>
  );
}
