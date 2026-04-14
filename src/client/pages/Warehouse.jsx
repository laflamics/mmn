import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import Dialog from '../components/Dialog';
import FilterBar from '../components/FilterBar';
import Table from '../components/Table';
import DNTemplate from '../../pdf/DNTemplate';

export default function Warehouse() {
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [previewNote, setPreviewNote] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [deliveredNote, setDeliveredNote] = useState(null);
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);
  const [deliveredProof, setDeliveredProof] = useState({
    sj_signed_url: null,
    delivery_photo_url: null
  });
  const [uploadingProof, setUploadingProof] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    sales_order_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    driver_name: '',
    vehicle_number: '',
    notes: '',
    status: 'pending'
  });

  const [selectedSO, setSelectedSO] = useState(null);
  const [usedSOIds, setUsedSOIds] = useState([]);

  useEffect(() => {
    fetchData();
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch delivery notes from database
      const { data: dnData, error: dnErr } = await supabase
        .from('delivery_notes')
        .select(`
          id,
          dn_number,
          sales_order_id,
          delivery_date,
          driver_name,
          vehicle_number,
          notes,
          status,
          sales_orders(
            id,
            order_number,
            customer_id,
            total_amount,
            customers(id, name, address, phone, email)
          ),
          delivery_note_items(
            id,
            product_id,
            quantity,
            products(name, sku)
          )
        `)
        .order('dn_number', { ascending: false });

      if (dnErr) throw dnErr;

      // Track SO IDs that already have delivery notes
      const usedIds = (dnData || []).map(dn => dn.sales_order_id);
      setUsedSOIds(usedIds);

      // Fetch confirmed SO with items for dropdown
      const { data: soData, error: soErr } = await supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          customer_id,
          total_amount,
          order_date,
          customers(id, name, address, phone, email),
          sales_order_items(
            id,
            product_id,
            quantity,
            unit_price,
            products(name, sku)
          )
        `)
        .eq('status', 'confirmed')
        .order('order_number', { ascending: false });

      if (soErr) throw soErr;

      setDeliveryNotes(dnData || []);
      setSalesOrders(soData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSOChange = (soId) => {
    try {
      setFormData({ ...formData, sales_order_id: soId });

      const so = salesOrders.find(s => s.id == soId);
      if (so) {
        setSelectedSO(so);
        // Auto-set delivery_date from SO order_date
        const deliveryDate = so.order_date ? so.order_date.split('T')[0] : new Date().toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          delivery_date: deliveryDate,
          notes: `Delivery for ${so.customers?.name || 'Customer'}`
        }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewItems = (note) => {
    setSelectedItems(note.delivery_note_items || []);
    setShowItemsModal(true);
  };

  const handleEditClick = (note) => {
    setEditingNote(note);
    // Ensure delivery_date is in YYYY-MM-DD format for input[type="date"]
    const deliveryDate = note.delivery_date ? note.delivery_date.split('T')[0] : new Date().toISOString().split('T')[0];
    setFormData({
      sales_order_id: note.sales_order_id,
      delivery_date: deliveryDate,
      driver_name: note.driver_name || '',
      vehicle_number: note.vehicle_number || '',
      notes: note.notes || '',
      status: note.status
    });
    const so = salesOrders.find(s => s.id == note.sales_order_id);
    setSelectedSO(so || null);
    setShowDialog(true);
  };

  const handlePrintDN = async (note) => {
    try {
      setPreviewNote(note);
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePrintFromPreview = async () => {
    try {
      const { printDeliveryNote } = await import('../lib/printDN');
      
      // Get company settings
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      const items = previewNote.delivery_note_items || [];
      printDeliveryNote(previewNote, items, companyData || {});
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeliveredClick = (note) => {
    setDeliveredNote(note);
    setDeliveredProof({
      sj_signed_url: null,
      delivery_photo_url: null
    });
    setShowDeliveredModal(true);
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProof(true);
      const fileName = `${deliveredNote.id}-${fieldName}-${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('delivery_proofs')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('delivery_proofs')
        .getPublicUrl(fileName);

      setDeliveredProof(prev => ({
        ...prev,
        [fieldName]: urlData.publicUrl
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleConfirmDelivered = async () => {
    try {
      setUploadingProof(true);

      // Update delivery note status to delivered
      const updateData = {
        status: 'delivered'
      };

      // Only add optional fields if they have values
      if (deliveredProof.sj_signed_url) {
        updateData.sj_signed_url = deliveredProof.sj_signed_url;
      }
      if (deliveredProof.delivery_photo_url) {
        updateData.delivery_photo_url = deliveredProof.delivery_photo_url;
      }

      const { error: updateErr } = await supabase
        .from('delivery_notes')
        .update(updateData)
        .eq('id', deliveredNote.id);

      if (updateErr) throw updateErr;

      // Get customer_id from sales_orders if not in deliveredNote
      let customerId = deliveredNote.sales_orders?.customer_id;
      
      if (!customerId) {
        // Fetch SO to get customer_id
        const { data: soData, error: soErr } = await supabase
          .from('sales_orders')
          .select('customer_id')
          .eq('id', deliveredNote.sales_order_id)
          .single();
        
        if (soErr) throw new Error('Could not fetch customer ID from sales order');
        customerId = soData?.customer_id;
      }

      if (!customerId) {
        throw new Error('Customer ID is required to create invoice');
      }

      // Create invoice from delivery note
      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: customerId,
        sales_order_id: deliveredNote.sales_order_id,
        delivery_note_id: deliveredNote.id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        total_amount: deliveredNote.sales_orders?.total_amount || 0,
        paid_amount: 0
      };

      const { error: invoiceErr } = await supabase
        .from('invoices')
        .insert([invoiceData]);

      if (invoiceErr) throw invoiceErr;

      setError('');
      setShowDeliveredModal(false);
      setDeliveredNote(null);
      fetchData();
      alert('Delivery confirmed! Invoice created successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleDeleteClick = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this delivery note?')) {
      return;
    }

    try {
      // Delete delivery note items first
      const { error: itemsErr } = await supabase
        .from('delivery_note_items')
        .delete()
        .eq('delivery_note_id', noteId);

      if (itemsErr) throw itemsErr;

      // Delete delivery note
      const { error: deleteErr } = await supabase
        .from('delivery_notes')
        .delete()
        .eq('id', noteId);

      if (deleteErr) throw deleteErr;

      setError('');
      alert('Delivery note deleted successfully!');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submit
    if (submitting) return;
    
    try {
      setSubmitting(true);
      
      if (!formData.sales_order_id) {
        setError('Please select a Sales Order');
        setSubmitting(false);
        return;
      }

      if (!selectedSO) {
        setError('Invalid Sales Order selected');
        setSubmitting(false);
        return;
      }

      const noteData = {
        sales_order_id: formData.sales_order_id,
        delivery_date: formData.delivery_date,
        driver_name: formData.driver_name,
        vehicle_number: formData.vehicle_number,
        notes: formData.notes,
        status: formData.status
      };

      let noteId;

      if (editingNote) {
        // Update existing note
        const { error: updateErr } = await supabase
          .from('delivery_notes')
          .update(noteData)
          .eq('id', editingNote.id);

        if (updateErr) throw updateErr;
        noteId = editingNote.id;
      } else {
        // Create new note with auto-generated DN number
        const dnNumber = `DN-${Date.now()}`;
        const { data: newNote, error: insertErr } = await supabase
          .from('delivery_notes')
          .insert([{
            ...noteData,
            dn_number: dnNumber
          }])
          .select();

        if (insertErr) throw insertErr;
        noteId = newNote[0].id;

        // Create delivery note items from SO items
        const items = (selectedSO.sales_order_items || []).map(item => ({
          delivery_note_id: noteId,
          product_id: item.product_id,
          quantity: item.quantity
        }));

        if (items.length > 0) {
          const { error: itemsErr } = await supabase
            .from('delivery_note_items')
            .insert(items);

          if (itemsErr) throw itemsErr;
        }
      }

      setError('');
      setShowDialog(false);
      setEditingNote(null);
      setSelectedSO(null);
      setFormData({
        sales_order_id: '',
        delivery_date: new Date().toISOString().split('T')[0],
        driver_name: '',
        vehicle_number: '',
        notes: '',
        status: 'pending'
      });
      fetchData();
      alert('Delivery note saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'dn_number', label: 'DN #', width: '8%' },
    { 
      key: 'order_number', 
      label: 'SO #', 
      width: '8%',
      render: (_, row) => row.sales_orders?.order_number || '-'
    },
    { 
      key: 'customer_name', 
      label: 'Customer', 
      width: '15%',
      render: (_, row) => row.sales_orders?.customers?.name || 'Unknown'
    },
    { 
      key: 'delivery_date', 
      label: 'Delivery Date', 
      width: '10%',
      render: (val) => formatDate(val)
    },
    { key: 'driver_name', label: 'Driver', width: '12%' },
    { key: 'vehicle_number', label: 'Vehicle', width: '10%' },
    { 
      key: 'items_count', 
      label: 'Items', 
      width: '8%',
      render: (_, row) => (row.delivery_note_items?.length || 0)
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '10%',
      render: (val) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          val === 'delivered' ? 'bg-green-500/30 text-green-200' :
          val === 'pending' ? 'bg-yellow-500/30 text-yellow-200' :
          'bg-blue-500/30 text-blue-200'
        }`}>
          {val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '22%',
      render: (_, row) => (
        <div className="flex gap-1 flex-col">
          <button
            onClick={() => handlePrintDN(row)}
            className="px-2 py-1 text-xs bg-purple-500/30 text-purple-200 hover:bg-purple-500/50 rounded transition-smooth font-medium"
          >
            Print
          </button>
          {row.status !== 'delivered' && (
            <button
              onClick={() => handleDeliveredClick(row)}
              className="px-2 py-1 text-xs bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded transition-smooth font-medium"
            >
              Delivered
            </button>
          )}
          <button
            onClick={() => handleViewItems(row)}
            className="px-2 py-1 text-xs bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth font-medium"
          >
            View Items
          </button>
          <button
            onClick={() => handleEditClick(row)}
            className="px-2 py-1 text-xs bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/50 rounded transition-smooth font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(row.id)}
            className="px-2 py-1 text-xs bg-red-500/30 text-red-200 hover:bg-red-500/50 rounded transition-smooth font-medium"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Delivery Notes</h1>
        <button
          onClick={() => {
            setEditingNote(null);
            setSelectedSO(null);
            setFormData({
              sales_order_id: '',
              delivery_date: new Date().toISOString().split('T')[0],
              driver_name: '',
              vehicle_number: '',
              notes: '',
              status: 'pending'
            });
            setShowDialog(true);
          }}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Create Delivery Note
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <FilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customerTypeFilter="all"
        setCustomerTypeFilter={() => {}}
        pageSize={pageSize}
        setPageSize={setPageSize}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchPlaceholder="DN # or Customer"
      />

      <Dialog
        isOpen={showDialog}
        title={editingNote ? "Edit Delivery Note" : "Create Delivery Note"}
        onClose={() => {
          setShowDialog(false);
          setEditingNote(null);
          setSelectedSO(null);
        }}
        onSubmit={handleSubmit}
        submitLabel={editingNote ? "Update" : "Create"}
        isSubmitting={submitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Sales Order *</label>
            <select
              value={formData.sales_order_id}
              onChange={(e) => handleSOChange(e.target.value)}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option className="bg-slate-800" value="">Select Sales Order</option>
              {salesOrders
                .filter(so => !usedSOIds.includes(so.id))
                .map(so => (
                  <option key={so.id} className="bg-slate-800" value={so.id}>
                    {so.order_number} - {so.customers?.name} ({so.sales_order_items?.length || 0} items)
                  </option>
                ))}
            </select>
          </div>

          {selectedSO && (
            <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
              <p className="text-xs text-slate-400">Selected SO Details</p>
              <p className="text-white font-semibold text-sm">{selectedSO.customers?.name}</p>
              <p className="text-xs text-slate-300">Items: {selectedSO.sales_order_items?.length || 0}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Delivery Date *</label>
            <input
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Driver Name</label>
            <input
              type="text"
              value={formData.driver_name}
              onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Driver name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Vehicle Number</label>
            <input
              type="text"
              value={formData.vehicle_number}
              onChange={(e) => setFormData({...formData, vehicle_number: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g., B 1234 ABC"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option className="bg-slate-800" value="pending">Pending</option>
              <option className="bg-slate-800" value="in_transit">In Transit</option>
              <option className="bg-slate-800" value="delivered">Delivered</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Additional notes..."
              rows="3"
            />
          </div>
        </form>
      </Dialog>

      {/* Items Detail Modal */}
      {showItemsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Delivery Items</h2>
              <button
                onClick={() => setShowItemsModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {selectedItems.map((item, idx) => (
                <div key={idx} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <p className="text-xs text-slate-400">Product</p>
                      <p className="text-white font-medium">{item.products?.name}</p>
                      <p className="text-xs text-slate-400 mt-1">SKU: {item.products?.sku}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Quantity</p>
                      <p className="text-white font-semibold text-lg">{item.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowItemsModal(false)}
              className="mt-4 w-full px-4 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded-lg transition-smooth font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Preview Surat Jalan Modal */}
      {showPreview && previewNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Preview Surat Jalan</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Preview Content - Using DNTemplate */}
            <div className="bg-white text-black p-6 rounded-lg mb-4 max-h-[60vh] overflow-y-auto">
              <DNTemplate 
                deliveryNote={previewNote}
                items={previewNote.delivery_note_items || []}
                company={{
                  name: 'PT. BINSIS INDONESIA',
                  address: 'Jl. Merdeka No. 123, Jakarta 12345',
                  phone: '+62 21 1234 5678',
                  email: 'info@binsis.co.id'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePrintFromPreview}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-smooth font-medium"
              >
                Print
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-4 py-2 glass-sm text-cyan-300 hover:text-cyan-100 rounded-lg transition-smooth font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Proof Modal */}
      {showDeliveredModal && deliveredNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Confirm Delivery</h2>
              <button
                onClick={() => setShowDeliveredModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400">Delivery Note</p>
                <p className="text-white font-semibold">{deliveredNote.dn_number}</p>
                <p className="text-xs text-slate-300 mt-2">Customer: {deliveredNote.sales_orders?.customers?.name}</p>
              </div>

              {/* SJ Signed Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Upload Signed SJ (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'sj_signed_url')}
                    disabled={uploadingProof}
                    className="flex-1 px-4 py-2 glass-sm rounded-lg text-white text-sm"
                  />
                  {deliveredProof.sj_signed_url && (
                    <span className="text-green-400 text-xs">✓ Uploaded</span>
                  )}
                </div>
              </div>

              {/* Delivery Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Upload Delivery Photo (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'delivery_photo_url')}
                    disabled={uploadingProof}
                    className="flex-1 px-4 py-2 glass-sm rounded-lg text-white text-sm"
                  />
                  {deliveredProof.delivery_photo_url && (
                    <span className="text-green-400 text-xs">✓ Uploaded</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400">Note:</p>
                <p className="text-xs text-slate-300">Both uploads are optional. Invoice will be created automatically upon confirmation.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleConfirmDelivered}
                disabled={uploadingProof}
                className={`flex-1 px-4 py-2 rounded-lg transition-smooth font-medium ${
                  uploadingProof
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                }`}
              >
                {uploadingProof ? 'Processing...' : 'Confirm Delivered'}
              </button>
              <button
                onClick={() => setShowDeliveredModal(false)}
                disabled={uploadingProof}
                className="flex-1 px-4 py-2 glass-sm text-cyan-300 hover:text-cyan-100 rounded-lg transition-smooth font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <Table columns={columns} data={deliveryNotes} rowsPerPage={20} />
      )}
    </div>
  );
}
