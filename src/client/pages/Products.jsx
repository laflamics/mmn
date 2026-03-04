import { useEffect, useState } from 'react';
import { getProducts, createProduct } from '../lib/api';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    type: '',
    category: '',
    unit_price: '',
    cost_price: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      await createProduct(formData);
      setFormData({ sku: '', name: '', type: '', category: '', unit_price: '', cost_price: '' });
      setShowDialog(false);
      setError('');
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setFormData({ sku: '', name: '', type: '', category: '', unit_price: '', cost_price: '' });
    setError('');
  };

  const columns = [
    { key: 'sku', label: 'SKU', width: '12%' },
    { key: 'name', label: 'Name', width: '22%' },
    { key: 'type', label: 'Type', width: '12%' },
    { key: 'category', label: 'Category', width: '18%' },
    { key: 'unit_price', label: 'Unit Price', width: '20%', render: (val) => `$${val}` },
    { key: 'cost_price', label: 'Cost Price', width: '20%', render: (val) => `$${val}` },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Products</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Add Product
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title="Add New Product"
        onClose={handleClose}
        onSubmit={handleSubmit}
        submitLabel="Save Product"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="text"
            placeholder="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="text"
            placeholder="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            placeholder="Unit Price"
            value={formData.unit_price}
            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            step="0.01"
          />
          <input
            type="number"
            placeholder="Cost Price"
            value={formData.cost_price}
            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            step="0.01"
          />
        </div>
      </Dialog>

      <Table columns={columns} data={products} rowsPerPage={20} />
    </div>
  );
}
