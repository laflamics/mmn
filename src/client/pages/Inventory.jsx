import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Table from '../components/Table';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error: err } = await supabase
        .from('inventory')
        .select(`
          *,
          products(sku, name, category, unit_price)
        `)
        .order('products(name)');
      
      if (err) throw err;
      setInventory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'sku', label: 'SKU', width: '12%', render: (_, row) => row.products.sku },
    { key: 'name', label: 'Product', width: '25%', render: (_, row) => row.products.name },
    { key: 'quantity_on_hand', label: 'On Hand', width: '12%' },
    { key: 'quantity_reserved', label: 'Reserved', width: '12%' },
    { key: 'quantity_available', label: 'Available', width: '12%' },
    { 
      key: 'value', 
      label: 'Value', 
      width: '15%',
      render: (_, row) => `$${(row.products.unit_price * row.quantity_on_hand).toFixed(2)}`
    },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold gradient-text mb-8">Inventory Management</h1>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <Table columns={columns} data={inventory} rowsPerPage={20} />
      )}
    </div>
  );
}
