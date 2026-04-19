import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadDocument } from '../lib/storage';
import Dialog from './Dialog';
import NumberInput from './NumberInput';

export default function ReceiveItemDialog({ isOpen, onClose, onSubmit, purchaseOrder }) {
  const [items, setItems] = useState([]);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadItems();
    }
  }, [isOpen, purchaseOrder]);

  const loadItems = async () => {
    try {
      const { data, error: err } = await supabase
        .from('purchase_order_items')
        .select(`
          id,
          quantity,
          unit_price,
          products(id, name, sku, uom)
        `)
        .eq('purchase_order_id', purchaseOrder.id);

      if (err) throw err;

      setItems(data.map(item => ({
        ...item,
        quantity_received: item.quantity
      })));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuantityChange = (index, value) => {
    const newItems = [...items];
    newItems[index].quantity_received = parseInt(value) || 0;
    setItems(newItems);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { url } = await uploadDocument(file);
      setPhotoUrl(url);
    } catch (err) {
      setError('Failed to upload photo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { url } = await uploadDocument(file);
      setDocumentUrl(url);
    } catch (err) {
      setError('Failed to upload document: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const getTotalReceived = () => {
    return items.reduce((sum, item) => sum + item.quantity_received, 0);
  };

  const getTotalOrdered = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getDiscrepancy = () => {
    return getTotalReceived() - getTotalOrdered();
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const totalReceived = getTotalReceived();
      if (totalReceived <= 0) {
        setError('Total quantity received must be greater than 0');
        return;
      }

      // Update inventory for each item
      for (const item of items) {
        if (item.quantity_received > 0) {
          // Check if already received for this item
          const { data: existingReceive } = await supabase
            .from('po_receive_items')
            .select('quantity_received')
            .eq('purchase_order_item_id', item.id);

          if (existingReceive && existingReceive.length > 0) {
            // Update existing receive record
            await supabase
              .from('po_receive_items')
              .update({
                quantity_received: item.quantity_received
              })
              .eq('purchase_order_item_id', item.id);
          } else {
            // Create new receive record
            await supabase
              .from('po_receive_items')
              .insert({
                purchase_order_item_id: item.id,
                quantity_received: item.quantity_received
              });
          }

          // Update inventory
          const { data: inv } = await supabase
            .from('inventory')
            .select('quantity_available')
            .eq('product_id', item.products.id);

          const currentQty = inv?.quantity_available || 0;
          const newQty = currentQty + item.quantity_received;

          await supabase
            .from('inventory')
            .upsert({
              product_id: item.products.id,
              quantity_available: newQty
            }, {
              onConflict: 'product_id'
            });
        }
      }

      // Update purchase_orders with total received
      const { error: updateErr } = await supabase
        .from('purchase_orders')
        .update({
          quantity_received: totalReceived,
          receive_date: receiveDate,
          receive_photo_url: photoUrl,
          receive_document_url: documentUrl,
          receive_notes: notes,
          status: 'received'
        })
        .eq('id', purchaseOrder.id);

      if (updateErr) throw updateErr;

      onSubmit();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!purchaseOrder) return null;

  const discrepancy = getDiscrepancy();
  const hasDiscrepancy = discrepancy !== 0;

  return (
    <Dialog
      isOpen={isOpen}
      title={`Receive Items - PO ${purchaseOrder.po_number}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Confirm Receive"
    >
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* PO Info */}
        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Supplier</p>
              <p className="text-white font-semibold">{purchaseOrder.supplier_name}</p>
            </div>
            <div>
              <p className="text-slate-400">Total Amount</p>
              <p className="text-white font-semibold">{purchaseOrder.total_amount}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Items</label>
          <div className="space-y-2">
            {items.map((item, idx) => {
              const diff = item.quantity_received - item.quantity;
              const diffColor = diff > 0 ? 'text-orange-400' : diff < 0 ? 'text-red-400' : 'text-green-400';
              return (
                <div key={idx} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">{item.products.name}</p>
                      <p className="text-slate-400 text-xs">SKU: {item.products.sku}</p>
                    </div>
                    <p className="text-slate-400 text-xs">Ordered: {item.quantity} {item.products.uom || 'pcs'}</p>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Received</label>
                      <NumberInput
                        value={item.quantity_received}
                        onChange={(val) => handleQuantityChange(idx, val)}
                        className="w-full px-3 py-2 glass-sm rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        allowDecimal={false}
                        min={0}
                      />
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-400 mb-1">Diff</p>
                      <p className={`font-semibold ${diffColor}`}>{diff > 0 ? '+' : ''}{diff}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-slate-400">Total Ordered</p>
              <p className="text-white font-semibold">{getTotalOrdered()}</p>
            </div>
            <div>
              <p className="text-slate-400">Total Received</p>
              <p className="text-blue-400 font-semibold">{getTotalReceived()}</p>
            </div>
            <div>
              <p className="text-slate-400">Discrepancy</p>
              <p className={`font-semibold ${hasDiscrepancy ? (discrepancy > 0 ? 'text-orange-400' : 'text-red-400') : 'text-green-400'}`}>
                {discrepancy > 0 ? '+' : ''}{discrepancy}
              </p>
            </div>
          </div>
          {hasDiscrepancy && (
            <p className={`text-xs mt-2 ${discrepancy > 0 ? 'text-orange-300' : 'text-red-300'}`}>
              {discrepancy > 0 ? `⚠️ Over received by ${discrepancy}` : `⚠️ Under received by ${Math.abs(discrepancy)}`}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Receive Date</label>
          <input
            type="date"
            value={receiveDate}
            onChange={(e) => setReceiveDate(e.target.value)}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
            placeholder="Add notes..."
            rows="2"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Photo (Optional)</label>
          <input
            type="file"
            onChange={handlePhotoUpload}
            disabled={uploading}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white text-xs"
            accept="image/*"
          />
          {photoUrl && <p className="text-xs text-green-400 mt-1">✓ Photo uploaded</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Document (Optional)</label>
          <input
            type="file"
            onChange={handleDocumentUpload}
            disabled={uploading}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white text-xs"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          />
          {documentUrl && <p className="text-xs text-green-400 mt-1">✓ Document uploaded</p>}
        </div>
      </div>
    </Dialog>
  );
}
