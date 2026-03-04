import { useEffect, useState } from 'react';
import { getSuppliers, createSupplier } from '../lib/api';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    plafond_limit: '',
  });

  useEffect(() => {
    fetchSuppliers();
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
      await createSupplier(formData);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        plafond_limit: '',
      });
      setShowDialog(false);
      setError('');
      fetchSuppliers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      plafond_limit: '',
    });
    setError('');
  };

  const columns = [
    { key: 'name', label: 'Name', width: '20%' },
    { key: 'contact_person', label: 'Contact', width: '15%' },
    { key: 'email', label: 'Email', width: '20%' },
    { key: 'phone', label: 'Phone', width: '15%' },
    { key: 'plafond_limit', label: 'Plafond Limit', width: '15%', render: (val) => `$${val}` },
    { key: 'plafond_used', label: 'Plafond Used', width: '15%', render: (val) => `$${val}` },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Suppliers</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Add Supplier
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title="Add New Supplier"
        onClose={handleClose}
        onSubmit={handleSubmit}
        submitLabel="Save Supplier"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Supplier Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="text"
            placeholder="Contact Person"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            placeholder="Plafond Limit"
            value={formData.plafond_limit}
            onChange={(e) => setFormData({ ...formData, plafond_limit: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            step="0.01"
          />
        </div>
      </Dialog>

      <Table columns={columns} data={suppliers} rowsPerPage={20} />
    </div>
  );
}
