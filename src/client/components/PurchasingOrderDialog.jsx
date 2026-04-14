import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';
import Dialog from './Dialog';

export default function PurchasingOrderDialog({ isOpen, onClose, onSubmit, editingOrder, preFilledReminder }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierInfo, setSupplierInfo] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);

  const [orderItems, setOrderItems] = useState([]);
  const [globalNote, setGlobalNote] = useState('');
  const [paymentType, setPaymentType] = useState('TOP');
  const [topDays, setTopDays] = useState(30);
  const [shipTo, setShipTo] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [preparedByName, setPreparedByName] = useState('');
  const [preparedBySignature, setPreparedBySignature] = useState('');
  const [preparedByPosition, setPreparedByPosition] = useState('');
  const [approvedByName, setApprovedByName] = useState('');
  const [approvedBySignature, setApprovedBySignature] = useState('');
  const [approvedByPosition, setApprovedByPosition] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      fetchProducts();
      fetchCompanySettings();
      if (editingOrder) {
        loadEditingOrder();
      } else if (preFilledReminder) {
        loadPreFilledReminder();
      }
    }
  }, [isOpen, editingOrder, preFilledReminder]);

  const fetchCompanySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setCompanySettings(data);
        setPreparedByName(data.prepared_by_name || '');
        setPreparedBySignature(data.prepared_by_signature_url || '');
        setPreparedByPosition(data.prepared_by_position || '');
        setApprovedByName(data.approved_by_name || '');
        setApprovedBySignature(data.approved_by_signature_url || '');
        setApprovedByPosition(data.approved_by_position || '');
      }
    } catch (err) {
      console.log('No company settings found');
    }
  };

  const loadEditingOrder = async () => {
    try {
      const { data: supplier, error: suppErr } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', editingOrder.supplier_id)
        .single();
      if (suppErr) throw suppErr;

      const { data: items, error: itemsErr } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', editingOrder.id);
      if (itemsErr) throw itemsErr;

      setSelectedSupplier(editingOrder.supplier_id);
      setSupplierInfo(supplier);
      setOrderItems(items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      })));
      setGlobalNote(editingOrder.notes || '');
      setPaymentType(editingOrder.payment_type || 'TOP');
      setTopDays(editingOrder.top_days || 30);
      setShipTo(editingOrder.ship_to || '');
      setDeliveryDate(editingOrder.delivery_date || new Date().toISOString().split('T')[0]);
      setPreparedByName(editingOrder.prepared_by_name || companySettings?.prepared_by_name || '');
      setPreparedBySignature(editingOrder.prepared_by_signature_url || companySettings?.prepared_by_signature_url || '');
      setPreparedByPosition(editingOrder.prepared_by_position || companySettings?.prepared_by_position || '');
      setApprovedByName(editingOrder.approved_by_name || companySettings?.approved_by_name || '');
      setApprovedBySignature(editingOrder.approved_by_signature_url || companySettings?.approved_by_signature_url || '');
      setApprovedByPosition(editingOrder.approved_by_position || companySettings?.approved_by_position || '');
    } catch (err) {
      setError(err.message);
    }
  };

  const loadPreFilledReminder = async () => {
    try {
      // If no supplier_id in reminder, user must select one
      if (!preFilledReminder.supplier_id) {
        // Just pre-fill product info without supplier
        const { data: product, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', preFilledReminder.product_id)
          .single();
        if (prodErr) throw prodErr;

        setOrderItems([{
          product_id: preFilledReminder.product_id,
          quantity: preFilledReminder.shortage_qty,
          unit_price: product?.cost_price || 0
        }]);
        
        setGlobalNote(`Restocking for shortage - ${preFilledReminder.shortage_qty} ${preFilledReminder.uom} needed`);
        return;
      }

      // Get supplier info from reminder
      const { data: supplier, error: suppErr } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', preFilledReminder.supplier_id)
        .single();
      if (suppErr) throw suppErr;

      // Get product info to get unit price
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', preFilledReminder.product_id)
        .single();
      if (prodErr) throw prodErr;

      // Calculate required quantity from SO
      // Get all SO items for this product that haven't been fulfilled
      const { data: soItems, error: soErr } = await supabase
        .from('sales_order_items')
        .select(`
          quantity,
          sales_orders(status)
        `)
        .eq('product_id', preFilledReminder.product_id)
        .in('sales_orders.status', ['pending', 'confirmed']);
      
      if (soErr) throw soErr;

      // Calculate total needed from SO
      const totalNeededFromSO = soItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Get current inventory
      const { data: inventory, error: invErr } = await supabase
        .from('inventory')
        .select('on_hand')
        .eq('product_id', preFilledReminder.product_id)
        .single();
      
      if (invErr && invErr.code !== 'PGRST116') throw invErr; // PGRST116 = no rows found

      const currentStock = inventory?.on_hand || 0;
      const quantityToBuy = Math.max(0, totalNeededFromSO - currentStock);

      // Pre-fill with reminder data and SO requirements
      setSelectedSupplier(preFilledReminder.supplier_id);
      setSupplierInfo(supplier);
      
      // Add the product from reminder with calculated quantity
      setOrderItems([{
        product_id: preFilledReminder.product_id,
        quantity: quantityToBuy || preFilledReminder.shortage_qty,
        unit_price: product?.cost_price || 0
      }]);
      
      setGlobalNote(`Restocking for SO demand - ${totalNeededFromSO} units needed, ${currentStock} in stock`);
      setPaymentType('TOP');
      setTopDays(30);
      setShipTo('');
      setDeliveryDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error('Error loading pre-filled reminder:', err);
      setError(err.message);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error: err } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (err) throw err;
      setSuppliers(data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (err) throw err;
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleSupplierChange = async (supplierId) => {
    setSelectedSupplier(supplierId);
    try {
      const { data, error: err } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();
      if (err) throw err;
      setSupplierInfo(data);
    } catch (err) {
      console.error('Error fetching supplier:', err);
    }
  };

  const handleAddItem = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...orderItems];
    if (field === 'product_id') {
      const product = products.find(p => p.id == value);
      newItems[index] = {
        ...newItems[index],
        product_id: value,
        unit_price: product?.cost_price || 0
      };
    } else {
      newItems[index][field] = field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0;
    }
    setOrderItems(newItems);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const subtotal = calculateSubtotal();
  const total = subtotal;
  const supplierPlafond = supplierInfo?.plafond_limit || 0;
  const supplierUsed = supplierInfo?.plafond_used || 0;
  const supplierRemaining = supplierPlafond - supplierUsed;
  const canBuy = Math.max(0, supplierRemaining - total);

  const handleSubmit = async () => {
    try {
      if (!selectedSupplier) {
        setError('Please select a supplier');
        return;
      }
      if (orderItems.length === 0) {
        setError('Please add at least one item');
        return;
      }

      // Validate all items have product_id and quantity
      for (let i = 0; i < orderItems.length; i++) {
        if (!orderItems[i].product_id) {
          setError(`Item ${i + 1}: Please select a product`);
          return;
        }
        if (!orderItems[i].quantity || orderItems[i].quantity <= 0) {
          setError(`Item ${i + 1}: Please enter a valid quantity`);
          return;
        }
      }

      // Get current user
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const { data: userData, error: userDataErr } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();
      
      const userName = userData?.name || user.email || 'Unknown';

      const poNumber = `PO-${Date.now()}`;
      
      if (editingOrder) {
        // Get old PO amount
        const { data: oldPOArray, error: oldErr } = await supabase
          .from('purchase_orders')
          .select('total_amount,supplier_id')
          .match({ id: editingOrder.id });
        if (oldErr) throw oldErr;
        
        const oldPO = oldPOArray?.[0];
        if (!oldPO) throw new Error('Purchase order not found');

        // Update supplier plafond_used (adjust for old amount)
        const oldSupplierUsed = supplierInfo?.plafond_used || 0;
        const newPlafondUsed = Math.max(0, oldSupplierUsed - (oldPO.total_amount || 0) + total);

        const { error: suppUpdateErr } = await supabase
          .from('suppliers')
          .update({ plafond_used: newPlafondUsed })
          .eq('id', selectedSupplier);
        if (suppUpdateErr) throw suppUpdateErr;

        // Update existing PO
        const { error: updateErr } = await supabase
          .from('purchase_orders')
          .update({
            supplier_id: selectedSupplier,
            total_amount: total,
            notes: globalNote,
            payment_type: paymentType,
            top_days: paymentType === 'TOP' ? topDays : null,
            ship_to: shipTo,
            delivery_date: deliveryDate,
            prepared_by_name: preparedByName,
            prepared_by_signature_url: preparedBySignature,
            prepared_by_position: preparedByPosition,
            approved_by_name: approvedByName,
            approved_by_signature_url: approvedBySignature,
            approved_by_position: approvedByPosition
          })
          .eq('id', editingOrder.id);
        if (updateErr) throw updateErr;

        // Delete old items
        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', editingOrder.id);
      } else {
        // Update supplier plafond_used (add new amount)
        const newPlafondUsed = (supplierUsed || 0) + total;

        const { error: suppUpdateErr } = await supabase
          .from('suppliers')
          .update({ plafond_used: newPlafondUsed })
          .eq('id', selectedSupplier);
        if (suppUpdateErr) throw suppUpdateErr;

        // Create new PO
        const { data: newPO, error: createErr } = await supabase
          .from('purchase_orders')
          .insert([{
            po_number: poNumber,
            supplier_id: selectedSupplier,
            order_date: new Date().toISOString(),
            total_amount: total,
            notes: globalNote,
            payment_type: paymentType,
            top_days: paymentType === 'TOP' ? topDays : null,
            ship_to: shipTo,
            delivery_date: deliveryDate,
            prepared_by_name: preparedByName,
            prepared_by_signature_url: preparedBySignature,
            prepared_by_position: preparedByPosition,
            approved_by_name: approvedByName,
            approved_by_signature_url: approvedBySignature,
            approved_by_position: approvedByPosition,
            status: 'pending'
          }])
          .select('id');
        if (createErr) throw createErr;

        // Insert items
        const itemsToInsert = orderItems.map(item => ({
          purchase_order_id: newPO[0].id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        }));

        const { error: itemsErr } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);
        if (itemsErr) throw itemsErr;
      }

      onSubmit();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      title={editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={editingOrder ? 'Update PO' : 'Create PO'}
    >
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Supplier Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Supplier *</label>
          <select
            value={selectedSupplier || ''}
            onChange={(e) => handleSupplierChange(e.target.value)}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id} className="bg-slate-800">
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        {/* Supplier Info */}
        {supplierInfo && (
          <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-slate-400">Plafond Limit</p>
                <p className="text-white font-semibold">{formatCurrency(supplierPlafond)}</p>
              </div>
              <div>
                <p className="text-slate-400">Used</p>
                <p className="text-yellow-300 font-semibold">{formatCurrency(supplierUsed)}</p>
              </div>
              <div>
                <p className="text-slate-400">Remaining</p>
                <p className={`font-semibold ${supplierRemaining < 0 ? 'text-red-300' : 'text-green-300'}`}>
                  {formatCurrency(supplierRemaining)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-medium text-slate-400">Items</label>
            <button
              onClick={handleAddItem}
              className="text-xs px-2 py-1 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-2">
            {orderItems.map((item, idx) => {
              const product = products.find(p => p.id == item.product_id);
              return (
                <div key={idx} className="flex gap-2 items-end">
                  <select
                    value={item.product_id || ''}
                    onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                    className="flex-1 px-2 py-1 glass-sm rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-800">
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-16 px-2 py-1 glass-sm rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Qty"
                    min="1"
                  />
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                    className="w-20 px-2 py-1 glass-sm rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Price"
                    step="0.01"
                  />
                  <span className="text-xs text-slate-400 w-20 text-right">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="px-2 py-1 bg-red-500/30 text-red-200 hover:bg-red-500/50 rounded text-xs transition-smooth"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-white font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="border-t border-slate-600 pt-2 flex justify-between">
            <span className="text-white font-semibold">Total</span>
            <span className="text-blue-300 font-bold">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Can Buy Info */}
        {supplierInfo && (
          <div className={`p-3 rounded-lg text-xs ${canBuy >= 0 ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <p className={canBuy >= 0 ? 'text-green-200' : 'text-red-200'}>
              Can buy: <span className="font-semibold">{formatCurrency(canBuy)}</span>
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Notes</label>
          <textarea
            value={globalNote}
            onChange={(e) => setGlobalNote(e.target.value)}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
            placeholder="Add notes..."
            rows="2"
          />
        </div>

        {/* Delivery Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Delivery Date</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
          />
        </div>

        {/* Signatures */}
        <div className="border-t border-slate-600 pt-3 mt-3">
          <p className="text-xs font-medium text-slate-400 mb-3">Signatures (from Settings or override)</p>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400 mb-1">Prepared By</p>
              <p className="text-white font-semibold">{preparedByName || '-'}</p>
              {preparedByPosition && <p className="text-slate-400 text-xs">{preparedByPosition}</p>}
              {preparedBySignature && (
                <img src={preparedBySignature} alt="Prepared By Signature" className="mt-1 h-12 border border-slate-600 rounded" />
              )}
            </div>
            <div>
              <p className="text-slate-400 mb-1">Approved By</p>
              <p className="text-white font-semibold">{approvedByName || '-'}</p>
              {approvedByPosition && <p className="text-slate-400 text-xs">{approvedByPosition}</p>}
              {approvedBySignature && (
                <img src={approvedBySignature} alt="Approved By Signature" className="mt-1 h-12 border border-slate-600 rounded" />
              )}
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Payment Type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
            >
              <option value="COD" className="bg-slate-800">COD (Cash on Delivery)</option>
              <option value="TOP" className="bg-slate-800">TOP (Terms of Payment)</option>
              <option value="CBD" className="bg-slate-800">CBD (Cash Before Delivery)</option>
            </select>
          </div>

          {paymentType === 'TOP' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">TOP Days</label>
              <input
                type="number"
                value={topDays}
                onChange={(e) => setTopDays(parseInt(e.target.value) || 30)}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                min="1"
              />
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
