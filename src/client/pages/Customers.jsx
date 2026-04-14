import { useEffect, useState } from 'react';
import { getCustomers, createCustomer } from '../lib/api';
import { cacheManager } from '../lib/cache';
import { formatCurrency, formatDate } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import { uploadDocument, deleteDocument } from '../lib/storage';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'B2B', 'B2C'
  const [formData, setFormData] = useState({
    name: '',
    customer_code: '',
    type: 'B2B',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    plafond_limit: '',
    pricing_tier: '',
    document_url: '',
    document_name: ''
  });
  const [uploading, setUploading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState('customers'); // 'customers' or 'pricing'
  const [importFile, setImportFile] = useState(null);
  
  // Custom pricing state
  const [showCustomPricingTab, setShowCustomPricingTab] = useState(false);
  const [selectedCustomerForPricing, setSelectedCustomerForPricing] = useState(null);
  const [customPricings, setCustomPricings] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAddPricingDialog, setShowAddPricingDialog] = useState(false);
  const [pricingFormData, setPricingFormData] = useState({
    product_id: '',
    custom_price: ''
  });

  const generateCustomerCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CUST-${timestamp}${random}`;
  };

  const fetchProducts = async () => {
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('id, sku, name, b2b_default_price')
        .eq('is_active', true)
        .order('name');
      if (err) throw err;
      setProducts(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchCustomPricings = async (customerId) => {
    try {
      const { data, error: err } = await supabase
        .from('customer_product_pricing')
        .select(`
          id,
          product_id,
          custom_price,
          products(sku, name, b2b_default_price)
        `)
        .eq('customer_id', customerId)
        .order('products(name)');
      if (err) throw err;
      setCustomPricings(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenCustomPricingTab = async (customer) => {
    if (customer.type !== 'B2B') {
      setError('Custom pricing is only available for B2B customers');
      return;
    }
    setSelectedCustomerForPricing(customer);
    setShowCustomPricingTab(true);
    await fetchProducts();
    await fetchCustomPricings(customer.id);
  };

  const handleAddCustomPricing = async () => {
    if (!pricingFormData.product_id || !pricingFormData.custom_price) {
      setError('Please select product and enter price');
      return;
    }

    try {
      const { error: err } = await supabase
        .from('customer_product_pricing')
        .upsert({
          customer_id: selectedCustomerForPricing.id,
          product_id: parseInt(pricingFormData.product_id),
          custom_price: parseFloat(pricingFormData.custom_price)
        });
      if (err) throw err;
      
      setPricingFormData({ product_id: '', custom_price: '' });
      setShowAddPricingDialog(false);
      await fetchCustomPricings(selectedCustomerForPricing.id);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCustomPricing = async (pricingId) => {
    if (window.confirm('Delete this custom pricing?')) {
      try {
        const { error: err } = await supabase
          .from('customer_product_pricing')
          .delete()
          .eq('id', pricingId);
        if (err) throw err;
        await fetchCustomPricings(selectedCustomerForPricing.id);
        setError('');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleOpenDialog = () => {
    setEditingId(null);
    setShowDialog(true);
    setFormData({
      name: '',
      customer_code: generateCustomerCode(),
      type: 'B2B',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      plafond_limit: '',
      pricing_tier: '',
      document_url: '',
      document_name: ''
    });
  };

  const handleEditClick = (customer) => {
    setEditingId(customer.id);
    setShowDialog(true);
    setFormData({
      name: customer.name,
      customer_code: customer.customer_code,
      type: customer.type,
      contact_person: customer.contact_person,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      plafond_limit: customer.plafond_limit,
      pricing_tier: customer.pricing_tier || '',
      document_url: customer.document_url || '',
      document_name: customer.document_name || ''
    });
  };

  const handleDeleteClick = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const { error: deleteError } = await supabase
          .from('customers')
          .delete()
          .eq('id', customerId);
        if (deleteError) throw deleteError;
        setError('');
        fetchCustomers();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { url, name } = await uploadDocument(file);
      setFormData(prev => ({
        ...prev,
        document_url: url,
        document_name: name
      }));
      setError('');
    } catch (err) {
      setError('Failed to upload document: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = async () => {
    if (formData.document_url) {
      try {
        setUploading(true);
        const path = formData.document_url.split('/').slice(-2).join('/');
        await deleteDocument(`documents/${path}`);
        setFormData(prev => ({
          ...prev,
          document_url: '',
          document_name: ''
        }));
      } catch (err) {
        setError('Failed to delete document: ' + err.message);
      } finally {
        setUploading(false);
      }
    }
  };

  useEffect(() => {
    fetchCustomers();
    
    // Cleanup: clear cache when component unmounts
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await getCustomers();
      
      // Fetch custom pricing untuk B2B customers
      const customersWithPricing = await Promise.all(
        data.map(async (customer) => {
          if (customer.type === 'B2B') {
            try {
              const { data: pricings, error: err } = await supabase
                .from('customer_product_pricing')
                .select(`
                  product_id,
                  custom_price,
                  products(sku, name)
                `)
                .eq('customer_id', customer.id);
              
              if (!err && pricings && pricings.length > 0) {
                customer.customPricingCount = pricings.length;
                customer.customPricingDetails = pricings;
              } else {
                customer.customPricingCount = 0;
                customer.customPricingDetails = [];
              }
            } catch (err) {
              customer.customPricingCount = 0;
              customer.customPricingDetails = [];
            }
          }
          return customer;
        })
      );
      
      setCustomers(customersWithPricing);
    } catch (err) {
      setError(err.message);
    }
  };

  const getFilteredCustomers = () => {
    let filtered = customers;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.customer_code?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const handleSubmit = async () => {
    try {
      const dataToSubmit = { ...formData };
      // Auto-generate customer code jika kosong
      if (!dataToSubmit.customer_code || dataToSubmit.customer_code.trim() === '') {
        dataToSubmit.customer_code = generateCustomerCode();
      }
      
      if (editingId) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update(dataToSubmit)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        // Create new customer
        await createCustomer(dataToSubmit);
      }
      setFormData({
        name: '',
        customer_code: '',
        type: 'B2B',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        plafond_limit: '',
        pricing_tier: '',
        document_url: '',
        document_name: ''
      });
      setEditingId(null);
      setShowDialog(false);
      setError('');
      fetchCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingId(null);
    setFormData({
      name: '',
      customer_code: '',
      type: 'B2B',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      plafond_limit: '',
      pricing_tier: '',
      document_url: '',
      document_name: ''
    });
    setError('');
  };

  const columns = [
    { key: 'name', label: 'Name', width: '10%' },
    { key: 'customer_code', label: 'Code', width: '7%' },
    { 
      key: 'type', 
      label: 'Type', 
      width: '5%',
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${val === 'B2B' ? 'bg-blue-500/30 text-blue-200' : 'bg-green-500/30 text-green-200'}`}>
          {val}
        </span>
      )
    },
    { key: 'sales_person', label: 'Sales Person', width: '8%' },
    { key: 'phone', label: 'Phone', width: '9%' },
    { key: 'address', label: 'Address', width: '15%' },
    { key: 'email', label: 'Email', width: '10%' },
    { key: 'plafond_limit', label: 'Plafond Limit', width: '8%', render: (val) => formatCurrency(val) },
    { key: 'plafond_used', label: 'Plafond Used', width: '8%', render: (val) => formatCurrency(val) },
    { 
      key: 'plafond_remaining', 
      label: 'Remaining', 
      width: '8%',
      render: (_, row) => {
        const remaining = (row.plafond_limit || 0) - (row.plafond_used || 0);
        const color = remaining < 0 ? 'text-red-400' : 'text-green-400';
        return <span className={color}>{formatCurrency(remaining)}</span>;
      }
    },
    {
      key: 'custom_pricing',
      label: 'Custom Pricing',
      width: '12%',
      render: (_, row) => {
        if (row.type !== 'B2B') return <span className="text-slate-500 text-xs">-</span>;
        const count = row.customPricingCount || 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">{count} items</span>
            <button
              onClick={() => handleOpenCustomPricingTab(row)}
              className="px-2 py-1 text-xs bg-purple-500/30 text-purple-200 hover:bg-purple-500/50 rounded transition-smooth font-medium"
            >
              {count > 0 ? 'View' : 'Add'}
            </button>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '10%',
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
        <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold gradient-text">Customers</h1>
        <div className="flex gap-1 sm:gap-2 md:gap-2">
          <button
            onClick={() => {
              setImportType('customers');
              setShowImportDialog(true);
            }}
            className="px-2 sm:px-3 md:px-4 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm lg:text-base"
          >
            📥 Import Customers
          </button>
          <button
            onClick={() => {
              setImportType('pricing');
              setShowImportDialog(true);
            }}
            className="px-2 sm:px-3 md:px-4 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm lg:text-base"
          >
            💰 Import Pricing
          </button>
          <button
            onClick={handleOpenDialog}
            className="px-2 sm:px-3 md:px-4 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm lg:text-base"
          >
            + Add Customer
          </button>
        </div>
      </div>

      {error && <div className="p-2 sm:p-2.5 md:p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm text-xs sm:text-xs md:text-sm">{error}</div>}

      {/* Search and Filter */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, phone, email, or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Types</option>
          <option value="B2B">B2B Only</option>
          <option value="B2C">B2C Only</option>
        </select>
      </div>

      <Dialog
        isOpen={showDialog}
        title={editingId ? "Edit Customer" : "Add New Customer"}
        onClose={handleClose}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Update Customer" : "Save Customer"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Customer Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Auto or manual"
                value={formData.customer_code}
                onChange={(e) => setFormData({ ...formData, customer_code: e.target.value })}
                className="flex-1 px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, customer_code: generateCustomerCode() })}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-smooth text-sm font-medium"
                title="Generate new code"
              >
                🔄 Generate
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Leave empty or click Generate to auto-generate</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Customer Name *</label>
            <input
              type="text"
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="B2B" className="bg-slate-800">B2B</option>
                <option value="B2C" className="bg-slate-800">B2C</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Contact Person</label>
              <input
                type="text"
                placeholder="Contact name"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Email</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Phone</label>
              <input
                type="tel"
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Address</label>
            <textarea
              placeholder="Full address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Plafond Limit</label>
            <input
              type="number"
              placeholder="Plafond limit"
              value={formData.plafond_limit}
              onChange={(e) => setFormData({ ...formData, plafond_limit: e.target.value })}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Pricing Tier (B2B Only)</label>
            <select
              value={formData.pricing_tier}
              onChange={(e) => setFormData({ ...formData, pricing_tier: e.target.value })}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="" className="bg-slate-800">-- Select Tier --</option>
              <option value="B2B_STANDARD" className="bg-slate-800">B2B Standard</option>
              <option value="B2B_PREMIUM" className="bg-slate-800">B2B Premium</option>
              <option value="B2B_DISTRIBUTOR" className="bg-slate-800">B2B Distributor</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Only for B2B customers. Leave empty for B2C.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Document (Optional)</label>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                onChange={handleDocumentUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {uploading && <span className="text-blue-400 text-sm">Uploading...</span>}
            </div>
            {formData.document_name && (
              <div className="mt-2 p-2 bg-blue-500/20 rounded-lg flex justify-between items-center">
                <span className="text-sm text-blue-300">📄 {formData.document_name}</span>
                <button
                  type="button"
                  onClick={handleRemoveDocument}
                  disabled={uploading}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      <Table columns={columns} data={getFilteredCustomers()} rowsPerPage={20} />

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">
              {importType === 'customers' ? 'Import Customers' : 'Import Customer Pricing'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 glass-sm rounded-lg text-white text-sm"
                />
                <p className="text-xs text-slate-400 mt-2">
                  {importType === 'customers' 
                    ? 'Format: name, type, sales_person, phone, address' 
                    : 'Format: customer_name, customer_type, sku, custom_price (B2B only)'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!importFile) {
                      setError('Please select a file');
                      return;
                    }
                    try {
                      setError('');
                      const text = await importFile.text();
                      const lines = text.split('\n');
                      const headers = lines[0].split(',').map(h => h.trim());
                      
                      if (importType === 'customers') {
                        // Import customers
                        let imported = 0;
                        let skipped = 0;
                        for (let i = 1; i < lines.length; i++) {
                          if (!lines[i].trim()) continue;
                          
                          const values = lines[i].split(',').map(v => v.trim());
                          const name = values[0];
                          const type = values[1] || 'B2C';
                          const sales_person = values[2] || '';
                          const phone = values[3] || '';
                          const address = values[4] || '';
                          
                          if (!name) continue;

                          try {
                            // Check if customer exists
                            const { data: existing, error: checkErr } = await supabase
                              .from('customers')
                              .select('id')
                              .eq('name', name)
                              .maybeSingle();

                            if (existing) {
                              // Update existing customer
                              const { error: updateErr } = await supabase
                                .from('customers')
                                .update({
                                  type,
                                  sales_person,
                                  phone,
                                  address
                                })
                                .eq('id', existing.id);
                              if (updateErr) throw updateErr;
                            } else {
                              // Insert new customer
                              const { error: insertErr } = await supabase
                                .from('customers')
                                .insert([{
                                  name,
                                  type,
                                  sales_person,
                                  phone,
                                  address,
                                  customer_code: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                  is_active: true
                                }]);
                              if (insertErr) {
                                if (insertErr.code === '23505') {
                                  // Duplicate key - skip
                                  skipped++;
                                  continue;
                                }
                                throw insertErr;
                              }
                            }
                            
                            imported++;
                          } catch (err) {
                            console.warn(`Error importing customer ${name}:`, err.message);
                            skipped++;
                          }
                        }
                        alert(`✓ Imported ${imported} customers successfully!${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
                      } else {
                        // Import customer pricing
                        let imported = 0;
                        
                        // Parse CSV properly (handle quoted fields)
                        const parseCSVLine = (line) => {
                          const result = [];
                          let current = '';
                          let inQuotes = false;
                          for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            if (char === '"') {
                              inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                              result.push(current.trim());
                              current = '';
                            } else {
                              current += char;
                            }
                          }
                          result.push(current.trim());
                          return result;
                        };
                        
                        for (let i = 1; i < lines.length; i++) {
                          if (!lines[i].trim()) continue;
                          
                          const values = parseCSVLine(lines[i]);
                          const customerName = values[0];
                          const sku = values[2];
                          const customPrice = parseFloat(values[3]);
                          
                          if (!customerName || !sku || !customPrice) continue;

                          // Find customer by name
                          const { data: customer, error: custErr } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('name', customerName)
                            .single();
                          
                          if (custErr && custErr.code !== 'PGRST116') throw custErr;
                          if (!customer) {
                            console.warn(`Customer not found: ${customerName}`);
                            continue;
                          }

                          // Find product by SKU
                          const { data: product, error: prodErr } = await supabase
                            .from('products')
                            .select('id')
                            .eq('sku', sku)
                            .single();
                          
                          if (prodErr && prodErr.code !== 'PGRST116') throw prodErr;
                          if (!product) {
                            console.warn(`Product not found: ${sku}`);
                            continue;
                          }

                          // Insert pricing
                          const { error: pricingErr } = await supabase
                            .from('customer_product_pricing')
                            .insert({
                              customer_id: customer.id,
                              product_id: product.id,
                              custom_price: customPrice
                            });
                          
                          if (pricingErr && pricingErr.code !== 'PGRST103') throw pricingErr;
                          imported++;
                        }
                        alert(`✓ Imported ${imported} pricing records successfully!`);
                      }
                      
                      setShowImportDialog(false);
                      setImportFile(null);
                      fetchCustomers();
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
                    setImportFile(null);
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

      {/* Custom Pricing Tab */}
      {showCustomPricingTab && selectedCustomerForPricing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">
                Custom Pricing - {selectedCustomerForPricing.name}
              </h2>
              <button
                onClick={() => {
                  setShowCustomPricingTab(false);
                  setSelectedCustomerForPricing(null);
                  setCustomPricings([]);
                }}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="mb-6">
              <button
                onClick={() => setShowAddPricingDialog(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-smooth font-medium text-sm"
              >
                + Add Custom Price
              </button>
            </div>

            {/* Add Pricing Dialog */}
            {showAddPricingDialog && (
              <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h3 className="text-lg font-semibold text-white mb-4">Add Custom Price</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Product</label>
                    <select
                      value={pricingFormData.product_id}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, product_id: e.target.value })}
                      className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="" className="bg-slate-800">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-800">
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Custom Price</label>
                    <input
                      type="number"
                      placeholder="Enter custom price"
                      value={pricingFormData.custom_price}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, custom_price: e.target.value })}
                      className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      step="0.01"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCustomPricing}
                      className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-smooth font-medium"
                    >
                      Save Price
                    </button>
                    <button
                      onClick={() => {
                        setShowAddPricingDialog(false);
                        setPricingFormData({ product_id: '', custom_price: '' });
                      }}
                      className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-smooth font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Pricing List */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Current Custom Prices</h3>
              {customPricings.length === 0 ? (
                <p className="text-slate-400 text-sm">No custom pricing set yet</p>
              ) : (
                <div className="space-y-2">
                  {customPricings.map(pricing => (
                    <div key={pricing.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div>
                        <p className="text-white font-medium">{pricing.products.sku} - {pricing.products.name}</p>
                        <p className="text-slate-400 text-sm">
                          Custom: {formatCurrency(pricing.custom_price)} 
                          {pricing.products.b2b_default_price && (
                            <span className="ml-2 text-slate-500">
                              (Default: {formatCurrency(pricing.products.b2b_default_price)})
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomPricing(pricing.id)}
                        className="px-3 py-1 text-xs bg-red-500/30 text-red-200 hover:bg-red-500/50 rounded transition-smooth font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
