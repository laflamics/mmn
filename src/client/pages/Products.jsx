import { useEffect, useState } from 'react';
import { getProducts, createProduct } from '../lib/api';
import { cacheManager } from '../lib/cache';
import { formatCurrency, formatDate } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    weight: '',
    type: '',
    category: '',
    uom: 'ZAK',
    unit_price: '',
    cost_price: '',
    b2c_locco_price_zak: '',
    b2c_franco_price_zak: '',
    b2c_cash: '',
    b2c_top_30: '',
    b2b_default_price: '',
  });
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    fetchProducts();
    
    // Cleanup: clear cache when component unmounts
    return () => {
      cacheManager.clearAll();
    };
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
      if (editingId) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            ...formData,
            unit_price: parseFloat(formData.unit_price) || 0,
            cost_price: parseFloat(formData.cost_price) || 0,
            b2c_locco_price_zak: parseFloat(formData.b2c_locco_price_zak) || null,
            b2c_franco_price_zak: parseFloat(formData.b2c_franco_price_zak) || null,
            b2c_cash: parseFloat(formData.b2c_cash) || null,
            b2c_top_30: parseFloat(formData.b2c_top_30) || null,
            b2b_default_price: parseFloat(formData.b2b_default_price) || null,
          })
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        await createProduct({
          ...formData,
          unit_price: parseFloat(formData.unit_price) || 0,
          cost_price: parseFloat(formData.cost_price) || 0,
          b2c_locco_price_zak: parseFloat(formData.b2c_locco_price_zak) || null,
          b2c_franco_price_zak: parseFloat(formData.b2c_franco_price_zak) || null,
          b2c_cash: parseFloat(formData.b2c_cash) || null,
          b2c_top_30: parseFloat(formData.b2c_top_30) || null,
          b2b_default_price: parseFloat(formData.b2b_default_price) || null,
        });
      }
      setFormData({ sku: '', name: '', type: '', category: '', uom: 'ZAK', unit_price: '', cost_price: '', b2c_locco_price_zak: '', b2c_franco_price_zak: '', b2c_cash: '', b2c_top_30: '', b2b_default_price: '' });
      setEditingId(null);
      setShowDialog(false);
      setError('');
      fetchProducts();
    } catch (err) {
      console.error('Product submit error:', err);
      setError(err.message);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingId(null);
    setFormData({ sku: '', name: '', type: '', category: '', uom: 'ZAK', unit_price: '', cost_price: '', b2c_locco_price_zak: '', b2c_franco_price_zak: '', b2c_cash: '', b2c_top_30: '', b2b_default_price: '' });
    setError('');
  };

  const handleEditClick = (product) => {
    setEditingId(product.id);
    setShowDialog(true);
    setFormData({
      sku: product.sku,
      name: product.name,
      weight: product.weight,
      type: product.type,
      category: product.category,
      uom: product.uom || 'ZAK',
      unit_price: product.unit_price,
      cost_price: product.cost_price,
      b2c_locco_price_zak: product.b2c_locco_price_zak || '',
      b2c_franco_price_zak: product.b2c_franco_price_zak || '',
      b2c_cash: product.b2c_cash || '',
      b2c_top_30: product.b2c_top_30 || '',
      b2b_default_price: product.b2b_default_price || '',
    });
  };

  const handleDeleteClick = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
        if (deleteError) {
          if (deleteError.message.includes('purchasing_reminders')) {
            throw new Error('Cannot delete product: There are purchasing reminders linked to this product. Delete the reminders first or contact admin.');
          }
          throw deleteError;
        }
        setError('');
        fetchProducts();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const columns = [
    { key: 'sku', label: 'SKU', width: '6%' },
    { key: 'name', label: 'Name', width: '12%' },
    { key: 'weight', label: 'Weight', width: '6%' },
    { key: 'type', label: 'Type', width: '6%' },
    { key: 'category', label: 'Category', width: '8%' },
    { key: 'uom', label: 'UOM', width: '5%' },
    { key: 'b2c_locco_price_zak', label: 'B2C Locco (Zak)', width: '8%', render: (val) => formatCurrency(val) },
    { key: 'b2c_franco_price_zak', label: 'B2C Franco (Zak)', width: '8%', render: (val) => formatCurrency(val) },
    { key: 'b2c_cash', label: 'B2C Cash', width: '8%', render: (val) => formatCurrency(val) },
    { key: 'b2c_top_30', label: 'B2C TOP 30', width: '8%', render: (val) => formatCurrency(val) },
    { key: 'b2b_default_price', label: 'B2B Default', width: '8%', render: (val) => formatCurrency(val) },
    { key: 'cost_price', label: 'Cost Price', width: '8%', render: (val) => formatCurrency(val) },
    {
      key: 'actions',
      label: 'Actions',
      width: '7%',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditClick(row)}
            className="px-3 py-1 text-xs bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(row.id)}
            className="px-3 py-1 text-xs bg-red-500/30 text-red-200 hover:bg-red-500/50 rounded transition-smooth font-medium"
          >
            Delete
          </button>
        </div>
      )
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold gradient-text">Products</h1>
        <div className="flex gap-1 sm:gap-2 md:gap-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="px-2 sm:px-3 md:px-4 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm lg:text-base"
          >
            📥 Import CSV
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="px-2 sm:px-3 md:px-4 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm lg:text-base"
          >
            + Add Product
          </button>
        </div>
      </div>

      {error && <div className="p-2 sm:p-2.5 md:p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm text-xs sm:text-xs md:text-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title={editingId ? "Edit Product" : "Add New Product"}
        onClose={handleClose}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Update Product" : "Save Product"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">SKU *</label>
              <input
                type="text"
                placeholder="Product SKU"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Product Name *</label>
              <input
                type="text"
                placeholder="Product name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Type</label>
              <input
                type="text"
                placeholder="Product type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Category</label>
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">UOM</label>
              <input
                type="text"
                placeholder="UOM"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Unit Price</label>
              <input
                type="number"
                placeholder="Unit price"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Cost Price</label>
              <input
                type="number"
                placeholder="Cost price"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                step="0.01"
              />
            </div>
          </div>

          <div className="border-t border-slate-600 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">B2C Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">B2C Locco (Zak)</label>
                <input
                  type="number"
                  placeholder="B2C Locco price per zak"
                  value={formData.b2c_locco_price_zak}
                  onChange={(e) => setFormData({ ...formData, b2c_locco_price_zak: e.target.value })}
                  className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">B2C Franco (Zak)</label>
                <input
                  type="number"
                  placeholder="B2C Franco price per zak"
                  value={formData.b2c_franco_price_zak}
                  onChange={(e) => setFormData({ ...formData, b2c_franco_price_zak: e.target.value })}
                  className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">B2C Cash</label>
                <input
                  type="number"
                  placeholder="B2C Cash price"
                  value={formData.b2c_cash}
                  onChange={(e) => setFormData({ ...formData, b2c_cash: e.target.value })}
                  className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">B2C TOP 30</label>
                <input
                  type="number"
                  placeholder="B2C TOP 30 price"
                  value={formData.b2c_top_30}
                  onChange={(e) => setFormData({ ...formData, b2c_top_30: e.target.value })}
                  className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-600 pt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">B2B Pricing</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">B2B Default Price</label>
              <input
                type="number"
                placeholder="B2B default price"
                value={formData.b2b_default_price}
                onChange={(e) => setFormData({ ...formData, b2b_default_price: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                step="0.01"
              />
            </div>
          </div>
        </div>
      </Dialog>

      <Table columns={columns} data={products} rowsPerPage={20} />

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Import Products</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select CSV File (products_import.csv)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  id="productImportFile"
                  className="w-full px-4 py-2 glass-sm rounded-lg text-white text-sm"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Format: sku, brand, weight, b2c_locco_price_zak, b2c_franco_price_zak, b2c_cash, b2c_top_30
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const file = document.getElementById('productImportFile').files[0];
                    if (!file) {
                      setError('Please select a file');
                      return;
                    }
                    try {
                      setError('');
                      const text = await file.text();
                      const lines = text.split('\n');
                      const headers = lines[0].split(',').map(h => h.trim());
                      
                      let imported = 0;
                      for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const values = lines[i].split(',').map(v => v.trim());
                        const row = {};
                        headers.forEach((h, idx) => {
                          row[h] = values[idx] || '';
                        });

                        if (!row.sku) continue;

                        // First check if product exists
                        const { data: existing } = await supabase
                          .from('products')
                          .select('id')
                          .eq('sku', row.sku)
                          .single();

                        if (existing) {
                          // Update existing product
                          const { error: updateErr } = await supabase
                            .from('products')
                            .update({
                              name: row.name,
                              b2c_locco_price_zak: parseFloat(row.b2c_locco_price_zak) || null,
                              b2c_franco_price_zak: parseFloat(row.b2c_franco_price_zak) || null,
                              b2c_cash: parseFloat(row.b2c_cash) || null,
                              b2c_top_30: parseFloat(row.b2c_top_30) || null
                            })
                            .eq('id', existing.id);
                          if (updateErr) throw updateErr;
                        } else {
                          // Insert new product
                          const { error: insertErr } = await supabase
                            .from('products')
                            .insert([{
                              sku: row.sku,
                              name: row.name,
                              b2c_locco_price_zak: parseFloat(row.b2c_locco_price_zak) || null,
                              b2c_franco_price_zak: parseFloat(row.b2c_franco_price_zak) || null,
                              b2c_cash: parseFloat(row.b2c_cash) || null,
                              b2c_top_30: parseFloat(row.b2c_top_30) || null,
                              is_active: true
                            }]);
                          if (insertErr) throw insertErr;
                        }
                        
                        imported++;
                      }
                      
                      setError('');
                      alert(`✓ Imported ${imported} products successfully!`);
                      setShowImportDialog(false);
                      document.getElementById('productImportFile').value = '';
                      fetchProducts();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded-lg transition-smooth font-medium"
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    setShowImportDialog(false);
                    document.getElementById('productImportFile').value = '';
                  }}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-smooth font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
