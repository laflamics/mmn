import { useEffect, useState } from 'react';
import { getSuppliers, createSupplier } from '../lib/api';
import { cacheManager } from '../lib/cache';
import { formatCurrency, formatDate } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import { uploadDocument, deleteDocument } from '../lib/storage';
import Dialog from '../components/Dialog';
import Table from '../components/Table';
import NumberInput from '../components/NumberInput';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    plafond_limit: '',
    document_url: '',
    document_name: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        await createSupplier(formData);
      }
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        plafond_limit: '',
      });
      setEditingId(null);
      setShowDialog(false);
      setError('');
      fetchSuppliers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingId(null);
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      plafond_limit: '',
      document_url: '',
      document_name: ''
    });
    setError('');
  };

  const handleEditClick = (supplier) => {
    setEditingId(supplier.id);
    setShowDialog(true);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      plafond_limit: supplier.plafond_limit,
      document_url: supplier.document_url || '',
      document_name: supplier.document_name || ''
    });
  };

  const handleDeleteClick = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        const { error: deleteError } = await supabase
          .from('suppliers')
          .delete()
          .eq('id', supplierId);
        if (deleteError) throw deleteError;
        setError('');
        fetchSuppliers();
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
        // Extract path from URL
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

  const columns = [
    { key: 'name', label: 'Name', width: '16%' },
    { key: 'contact_person', label: 'Contact', width: '11%' },
    { key: 'email', label: 'Email', width: '16%' },
    { key: 'phone', label: 'Phone', width: '11%' },
    { key: 'plafond_limit', label: 'Plafond Limit', width: '11%', render: (val) => formatCurrency(val) },
    { key: 'plafond_used', label: 'Plafond Used', width: '11%', render: (val) => formatCurrency(val) },
    { 
      key: 'plafond_remaining', 
      label: 'Plafond Remaining', 
      width: '12%',
      render: (_, row) => {
        const remaining = (row.plafond_limit || 0) - (row.plafond_used || 0);
        const color = remaining < 0 ? 'text-red-400' : 'text-green-400';
        return <span className={color}>{formatCurrency(remaining)}</span>;
      }
    },
    { key: 'created_at', label: 'Created', width: '8%', render: (val) => formatDate(val) },
    {
      key: 'document',
      label: 'Doc',
      width: '6%',
      render: (_, row) => (
        row.document_url ? (
          <a
            href={row.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-xs bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded transition-smooth font-medium"
          >
            View Doc
          </a>
        ) : (
          <button
            onClick={() => handleEditClick(row)}
            className="px-3 py-1 text-xs bg-slate-500/30 text-slate-200 hover:bg-slate-500/50 rounded transition-smooth font-medium"
          >
            Upload
          </button>
        )
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '8%',
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
        <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold gradient-text">Suppliers</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="px-2 sm:px-3 md:px-4 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm lg:text-base"
        >
          + Add Supplier
        </button>
      </div>

      {error && <div className="p-2 sm:p-2.5 md:p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm text-xs sm:text-xs md:text-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title={editingId ? "Edit Supplier" : "Add New Supplier"}
        onClose={handleClose}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Update Supplier" : "Save Supplier"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Supplier Name *</label>
              <input
                type="text"
                placeholder="Supplier name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
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
            <NumberInput
              placeholder="Plafond limit"
              value={formData.plafond_limit}
              onChange={(val) => setFormData({ ...formData, plafond_limit: val })}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              allowDecimal={true}
            />
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

      <Table columns={columns} data={suppliers} rowsPerPage={20} />
    </div>
  );
}
