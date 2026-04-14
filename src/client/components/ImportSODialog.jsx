import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseDataFile } from '../lib/csvParser';
import Dialog from './Dialog';

export default function ImportSODialog({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [step, setStep] = useState('upload'); // upload, preview, importing, done

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      setError('');
      const text = await selectedFile.text();
      const data = parseDataFile(text);
      
      // Extract SO data from parsed file
      const soData = data.salesOrders || [];
      setParsedData({ salesOrders: soData });
      setFile(selectedFile);
      setStep('preview');
    } catch (err) {
      setError('Failed to parse file: ' + err.message);
    }
  };

  const handleImport = async () => {
    if (!parsedData?.salesOrders) return;

    try {
      setImporting(true);
      setError('');
      setImportStatus('Starting SO import...');

      let importedCount = 0;
      let skippedCount = 0;

      for (const so of parsedData.salesOrders) {
        try {
          setImportStatus(`Importing SO ${so.so_number}...`);

          // Find or create customer
          let customerId;
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('name', so.customer_name)
            .single();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer, error: custErr } = await supabase
              .from('customers')
              .insert([{
                name: so.customer_name,
                customer_code: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'B2B',
                is_active: true
              }])
              .select();
            
            if (custErr) throw custErr;
            customerId = newCustomer[0].id;
          }

          // Create sales order
          const { data: newSO, error: soErr } = await supabase
            .from('sales_orders')
            .insert([{
              so_number: so.so_number,
              customer_id: customerId,
              order_date: so.order_date || new Date().toISOString().split('T')[0],
              delivery_date: so.delivery_date,
              total_amount: so.total_amount || 0,
              status: 'pending',
              notes: so.notes || ''
            }])
            .select();

          if (soErr) throw soErr;
          const soId = newSO[0].id;

          // Import SO items
          if (so.items && so.items.length > 0) {
            for (const item of so.items) {
              // Find product by SKU
              const { data: product } = await supabase
                .from('products')
                .select('id')
                .eq('sku', item.sku)
                .single();

              if (!product) continue;

              await supabase
                .from('sales_order_items')
                .insert([{
                  sales_order_id: soId,
                  product_id: product.id,
                  quantity: item.quantity || 0,
                  unit_price: item.unit_price || 0,
                  total_price: (item.quantity || 0) * (item.unit_price || 0)
                }]);
            }
          }

          importedCount++;
        } catch (itemErr) {
          console.error(`Error importing SO ${so.so_number}:`, itemErr);
          skippedCount++;
        }
      }

      setImportStatus(`Import completed! ${importedCount} SO imported, ${skippedCount} skipped.`);
      setStep('done');
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setImporting(false);
    setError('');
    setImportStatus('');
    setStep('upload');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Import Sales Orders"
      onClose={handleClose}
      onSubmit={step === 'preview' ? handleImport : handleClose}
      submitLabel={step === 'preview' ? 'Import SO' : 'Close'}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === 'upload' && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-slate-400 mt-2">
              Upload CSV file containing Sales Orders data
            </p>
          </div>
        )}

        {step === 'preview' && parsedData && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">Preview Data</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sales Orders:</span>
                  <span className="text-blue-400 font-semibold">
                    {parsedData.salesOrders.length} orders
                  </span>
                </div>
              </div>
            </div>

            {parsedData.salesOrders.length > 0 && (
              <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-700/30">
                <h4 className="text-xs font-semibold text-blue-300 mb-2">Sales Orders Preview</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {parsedData.salesOrders.slice(0, 5).map((so, i) => (
                    <div key={i} className="text-xs text-slate-300">
                      <span className="font-medium">{so.so_number}</span>
                      {' - '}
                      <span className="text-blue-300">{so.customer_name}</span>
                      {' - '}
                      <span className="text-slate-400">{so.items?.length || 0} items</span>
                    </div>
                  ))}
                  {parsedData.salesOrders.length > 5 && (
                    <p className="text-xs text-slate-500">
                      ... and {parsedData.salesOrders.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {(step === 'importing' || step === 'done') && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 text-blue-200 rounded-lg text-sm">
              {importStatus}
            </div>
            {step === 'importing' && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
