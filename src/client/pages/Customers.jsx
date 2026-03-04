import { useEffect, useState } from 'react';
import { getCustomers, createCustomer } from '../lib/api';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'B2B',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    plafond_limit: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      await createCustomer(formData);
      setFormData({
        name: '',
        type: 'B2B',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        plafond_limit: '',
      });
      setShowDialog(false);
      setError('');
      fetchCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setFormData({
      name: '',
      type: 'B2B',
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
    { key: 'name', label: 'Name', width: '18%' },
    { key: 'customer_code', label: 'Code', width: '10%' },
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
    { key: 'contact_person', label: 'Contact', width: '15%' },
    { key: 'email', label: 'Email', width: '18%' },
    { key: 'plafond_limit', label: 'Plafond Limit', width: '15%', render: (val) => `$${val}` },
    { key: 'plafond_used', label: 'Plafond Used', width: '15%', render: (val) => `$${val}` },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Customers</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Add Customer
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title="Add New Customer"
        onClose={handleClose}
        onSubmit={handleSubmit}
        submitLabel="Save Customer"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Customer Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="B2B" className="bg-slate-800">B2B</option>
            <option value="B2C" className="bg-slate-800">B2C</option>
          </select>
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

      <Table columns={columns} data={customers} rowsPerPage={20} />
    </div>
  );
}
