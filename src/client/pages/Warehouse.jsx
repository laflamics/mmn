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
  const [soSearch, setSoSearch] = useState('');
  const [showSODropdown, setShowSODropdown] = useState(false);
  const [dnItems, setDnItems] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductSearch, setAddProductSearch] = useState('');

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

      // Fetch all products for "add product" feature
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, sku')
        .order('name', { ascending: true });
      setAllProducts(prodData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSOSelect = (so) => {
    try {
      setFormData(prev => ({
        ...prev,
        sales_order_id: so.id,
        delivery_date: so.order_date ? so.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: `Delivery for ${so.customers?.name || 'Customer'}`
      }));
      setSelectedSO(so);
      setSoSearch(`${so.order_number} - ${so.customers?.name || ''}`);
      setShowSODropdown(false);
      // Pre-populate DN items from SO items
      const items = (so.sales_order_items || []).map(item => ({
        product_id: item.product_id,
        product_name: item.products?.name || '-',
        product_sku: item.products?.sku || '-',
        so_quantity: item.quantity,
        quantity: item.quantity,
        unit_price: item.unit_price,
        checked: true
      }));
      setDnItems(items);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredSOs = salesOrders
    .filter(so => !usedSOIds.includes(so.id) || (editingNote && so.id === editingNote.sales_order_id))
    .filter(so => {
      if (!soSearch || (selectedSO && soSearch === `${so.order_number} - ${so.customers?.name || ''}`)) return true;
      const q = soSearch.toLowerCase();
      return so.order_number?.toLowerCase().includes(q) || so.customers?.name?.toLowerCase().includes(q);
    });

  const handleViewItems = (note) => {
    setSelectedItems(note.delivery_note_items || []);
    setShowItemsModal(true);
  };

  const handleEditClick = (note) => {
    setEditingNote(note);
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
    setSoSearch(so ? `${so.order_number} - ${so.customers?.name || ''}` : '');
    // Populate items from existing DN items or SO items
    const existingItems = note.delivery_note_items || [];
    if (existingItems.length > 0) {
      const soItems = so?.sales_order_items || [];
      const items = existingItems.map(item => {
        const soItem = soItems.find(si => si.product_id === item.product_id);
        return {
          product_id: item.product_id,
          product_name: item.products?.name || '-',
          product_sku: item.products?.sku || '-',
          so_quantity: soItem?.quantity || item.quantity,
          quantity: item.quantity,
          unit_price: soItem?.unit_price || 0,
          checked: true
        };
      });
      setDnItems(items);
    } else if (so) {
      const items = (so.sales_order_items || []).map(item => ({
        product_id: item.product_id,
        product_name: item.products?.name || '-',
        product_sku: item.products?.sku || '-',
        so_quantity: item.quantity,
        quantity: item.quantity,
        unit_price: item.unit_price,
        checked: true
      }));
      setDnItems(items);
    }
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

        // Delete old items and re-insert updated ones
        await supabase.from('delivery_note_items').delete().eq('delivery_note_id', noteId);

        const updatedItems = dnItems
          .filter(item => item.checked && item.quantity > 0)
          .map(item => ({
            delivery_note_id: noteId,
            product_id: item.product_id,
            quantity: item.quantity
          }));

        if (updatedItems.length > 0) {
          const { error: itemsErr } = await supabase
            .from('delivery_note_items')
            .insert(updatedItems);
          if (itemsErr) throw itemsErr;
        }
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

        // Create delivery note items from dnItems (user-edited)
        const items = dnItems
          .filter(item => item.checked && item.quantity > 0)
          .map(item => ({
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
      setSoSearch('');
      setDnItems([]);
      setShowAddProduct(false);
      setAddProductSearch('');
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
            setSoSearch('');
            setDnItems([]);
            setShowAddProduct(false);
            setAddProductSearch('');
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
          setSoSearch('');
          setDnItems([]);
          setShowAddProduct(false);
          setAddProductSearch('');
        }}
        onSubmit={handleSubmit}
        submitLabel={editingNote ? "Update" : "Create"}
        isSubmitting={submitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Sales Order *</label>
            <div className="relative">
              <input
                type="text"
                value={soSearch}
                onChange={(e) => {
                  setSoSearch(e.target.value);
                  setShowSODropdown(true);
                  if (!e.target.value) {
                    setSelectedSO(null);
                    setDnItems([]);
                    setFormData(prev => ({ ...prev, sales_order_id: '' }));
                  }
                }}
                onFocus={() => setShowSODropdown(true)}
                onBlur={() => setTimeout(() => setShowSODropdown(false), 200)}
                placeholder="Cari SO number atau nama customer..."
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {showSODropdown && filteredSOs.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredSOs.map(so => (
                    <div
                      key={so.id}
                      onMouseDown={() => handleSOSelect(so)}
                      className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-sm text-white border-b border-slate-700 last:border-0"
                    >
                      <span className="font-semibold text-blue-300">{so.order_number}</span>
                      <span className="text-slate-300 ml-2">- {so.customers?.name}</span>
                      <span className="text-slate-500 ml-2 text-xs">({so.sales_order_items?.length || 0} items)</span>
                    </div>
                  ))}
                </div>
              )}
              {showSODropdown && soSearch && filteredSOs.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl px-4 py-3 text-slate-400 text-sm">
                  Tidak ada SO ditemukan
                </div>
              )}
            </div>
          </div>

          {selectedSO && (
            <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
              <p className="text-xs text-slate-400">Selected SO</p>
              <p className="text-white font-semibold text-sm">{selectedSO.customers?.name}</p>
              <p className="text-xs text-slate-300">{selectedSO.sales_order_items?.length || 0} items</p>
            </div>
          )}

          {dnItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400">
                  Products to Deliver
                  <span className="ml-2 text-blue-400">
                    ({dnItems.filter(i => i.checked).length}/{dnItems.length} dipilih)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const allChecked = dnItems.every(i => i.checked);
                    setDnItems(prev => prev.map(i => ({ ...i, checked: !allChecked })));
                  }}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  {dnItems.every(i => i.checked) ? 'Uncheck All' : 'Check All'}
                </button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {dnItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg px-3 py-2 flex items-center gap-3 transition-colors ${
                      item.checked
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-800/30 border-slate-700/50 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => setDnItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: e.target.checked } : it))}
                      className="w-4 h-4 accent-blue-500 shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-slate-400 text-xs">{item.product_sku}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.so_quantity != null && (
                        <span className="text-slate-500 text-xs">SO: {item.so_quantity}</span>
                      )}
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        disabled={!item.checked}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setDnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                        }}
                        className="w-20 px-2 py-1 glass-sm rounded text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-40"
                      />
                      <button
                        type="button"
                        onClick={() => setDnItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 text-lg leading-none px-1"
                        title="Hapus item"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Centang item yang akan dikirim. Uncheck atau hapus untuk tidak mengirim.</p>
            </div>
          )}

          {/* Add Product */}
          <div>
            <button
              type="button"
              onClick={() => { setShowAddProduct(p => !p); setAddProductSearch(''); }}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              + Tambah Product
            </button>
            {showAddProduct && (
              <div className="mt-2 relative">
                <input
                  type="text"
                  value={addProductSearch}
                  onChange={(e) => setAddProductSearch(e.target.value)}
                  placeholder="Cari nama atau SKU produk..."
                  className="w-full px-3 py-2 glass-sm rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                {addProductSearch && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {allProducts
                      .filter(p => {
                        const q = addProductSearch.toLowerCase();
                        return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
                      })
                      .slice(0, 20)
                      .map(p => (
                        <div
                          key={p.id}
                          onMouseDown={() => {
                            const alreadyExists = dnItems.some(i => i.product_id === p.id);
                            if (alreadyExists) {
                              // just check it if unchecked
                              setDnItems(prev => prev.map(i => i.product_id === p.id ? { ...i, checked: true } : i));
                            } else {
                              setDnItems(prev => [...prev, {
                                product_id: p.id,
                                product_name: p.name,
                                product_sku: p.sku || '-',
                                so_quantity: null,
                                quantity: 1,
                                checked: true
                              }]);
                            }
                            setAddProductSearch('');
                            setShowAddProduct(false);
                          }}
                          className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-sm text-white border-b border-slate-700 last:border-0"
                        >
                          <span className="font-medium">{p.name}</span>
                          {p.sku && <span className="text-slate-400 ml-2 text-xs">{p.sku}</span>}
                        </div>
                      ))}
                    {allProducts.filter(p => {
                      const q = addProductSearch.toLowerCase();
                      return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="px-3 py-2 text-slate-400 text-sm">Produk tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
                  name: 'PT. MINA MANDIRI NUSANTARA',
                  address: 'Jl. DR. Cipto Mangunkusumo No.178, Kesambi, Kec. Kesambi, Kota Cirebon, Jawa Barat 45153',
                  phone: '+62 877 7715 0768',
                  email: 'ikurniawan8@gmail.com'
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
