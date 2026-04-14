import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseDataFile } from '../lib/csvParser';
import { formatCurrency } from '../lib/formatters';
import Dialog from './Dialog';

export default function DataImportDialog({ isOpen, onClose, onSuccess }) {
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
      setParsedData(data);
      setFile(selectedFile);
      setStep('preview');
    } catch (err) {
      setError('Failed to parse file: ' + err.message);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    try {
      setImporting(true);
      setError('');
      setImportStatus('Starting import...');

      // Step 1: Import B2C default pricing to products
      if (parsedData.b2cDefaultPricing && parsedData.b2cDefaultPricing.length > 0) {
        setImportStatus('Importing B2C default pricing...');
        await importB2CDefaultPricing(parsedData.b2cDefaultPricing);
      }

      // Step 2: Import B2C customers
      if (parsedData.b2cCustomers && parsedData.b2cCustomers.length > 0) {
        setImportStatus('Importing B2C customers...');
        await importCustomers(parsedData.b2cCustomers);
      }

      // Step 3: Import B2B customers
      if (parsedData.b2bCustomers && parsedData.b2bCustomers.length > 0) {
        setImportStatus('Importing B2B customers...');
        await importCustomers(parsedData.b2bCustomers);
      }

      setImportStatus('Import completed successfully!');
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

  const importB2CDefaultPricing = async (products) => {
    for (const product of products) {
      // Find or create product by SKU
      const { data: existing, error: findErr } = await supabase
        .from('products')
        .select('id')
        .eq('sku', product.sku)
        .single();

      if (findErr && findErr.code !== 'PGRST116') throw findErr;

      const updateData = {
        brand: product.brand,
        b2c_locco_price_zak: product.b2c_locco_price_zak,
        b2c_franco_price_zak: product.b2c_franco_price_zak,
        weight: product.weight
      };

      if (existing) {
        // Update existing product
        const { error: updateErr } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', existing.id);
        if (updateErr) throw updateErr;
      } else {
        // Create new product
        const { error: createErr } = await supabase
          .from('products')
          .insert([{
            sku: product.sku,
            name: `${product.brand} ${product.sku}`,
            category: 'Rice',
            uom: 'ZAK',
            ...updateData,
            is_active: true
          }]);
        if (createErr) throw createErr;
      }
    }
  };

  const importCustomers = async (customers) => {
    for (const customer of customers) {
      // Find or create customer
      const { data: existing, error: findErr } = await supabase
        .from('customers')
        .select('id')
        .eq('name', customer.name)
        .single();

      if (findErr && findErr.code !== 'PGRST116') throw findErr;

      let customerId;

      if (existing) {
        customerId = existing.id;
        // Update customer type if needed
        const { error: updateErr } = await supabase
          .from('customers')
          .update({ type: customer.type })
          .eq('id', customerId);
        if (updateErr) throw updateErr;
      } else {
        // Create new customer
        const { data: newCustomer, error: createErr } = await supabase
          .from('customers')
          .insert([{
            name: customer.name,
            customer_code: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: customer.type,
            is_active: true
          }])
          .select();
        if (createErr) throw createErr;
        customerId = newCustomer[0].id;
      }

      // Import custom pricing for this customer
      for (const [sku, price] of Object.entries(customer.pricing)) {
        // Find product by SKU
        const { data: product, error: prodErr } = await supabase
          .from('products')
          .select('id')
          .eq('sku', sku)
          .single();

        if (prodErr && prodErr.code !== 'PGRST116') throw prodErr;
        if (!product) continue; // Skip if product not found

        // Upsert custom pricing
        const { error: pricingErr } = await supabase
          .from('customer_product_pricing')
          .upsert({
            customer_id: customerId,
            product_id: product.id,
            custom_price: price
          });
        if (pricingErr) throw pricingErr;
      }
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
      title="Import Data from CSV"
      onClose={handleClose}
      onSubmit={step === 'preview' ? handleImport : handleClose}
      submitLabel={step === 'preview' ? 'Import Data' : 'Close'}
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
              Upload the data file from your client (Data MMN - Noxtiz.csv)
            </p>
          </div>
        )}

        {step === 'preview' && parsedData && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">Preview Data</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">B2C Default Pricing:</span>
                  <span className="text-blue-400 font-semibold">
                    {parsedData.b2cDefaultPricing.length} products
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">B2C Customers:</span>
                  <span className="text-green-400 font-semibold">
                    {parsedData.b2cCustomers.length} customers
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">B2B Customers:</span>
                  <span className="text-purple-400 font-semibold">
                    {parsedData.b2bCustomers.length} customers
                  </span>
                </div>
              </div>
            </div>

            {/* B2C Default Pricing Preview */}
            {parsedData.b2cDefaultPricing.length > 0 && (
              <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-700/30">
                <h4 className="text-xs font-semibold text-blue-300 mb-2">B2C Default Pricing</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {parsedData.b2cDefaultPricing.slice(0, 5).map((p, i) => (
                    <div key={i} className="text-xs text-slate-300">
                      <span className="font-medium">{p.sku}</span>
                      {' - '}
                      <span className="text-blue-300">
                        Locco: {formatCurrency(p.b2c_locco_price_zak)}
                      </span>
                      {' / '}
                      <span className="text-blue-300">
                        Franco: {formatCurrency(p.b2c_franco_price_zak)}
                      </span>
                    </div>
                  ))}
                  {parsedData.b2cDefaultPricing.length > 5 && (
                    <p className="text-xs text-slate-500">
                      ... and {parsedData.b2cDefaultPricing.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* B2C Customers Preview */}
            {parsedData.b2cCustomers.length > 0 && (
              <div className="bg-green-900/20 p-3 rounded-lg border border-green-700/30">
                <h4 className="text-xs font-semibold text-green-300 mb-2">B2C Customers</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {parsedData.b2cCustomers.slice(0, 5).map((c, i) => (
                    <div key={i} className="text-xs text-slate-300">
                      <span className="font-medium">{c.name}</span>
                      {' - '}
                      <span className="text-green-300">
                        {Object.keys(c.pricing).length} SKUs
                      </span>
                    </div>
                  ))}
                  {parsedData.b2cCustomers.length > 5 && (
                    <p className="text-xs text-slate-500">
                      ... and {parsedData.b2cCustomers.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* B2B Customers Preview */}
            {parsedData.b2bCustomers.length > 0 && (
              <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-700/30">
                <h4 className="text-xs font-semibold text-purple-300 mb-2">B2B Customers</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {parsedData.b2bCustomers.slice(0, 5).map((c, i) => (
                    <div key={i} className="text-xs text-slate-300">
                      <span className="font-medium">{c.name}</span>
                      {' - '}
                      <span className="text-purple-300">
                        {Object.keys(c.pricing).length} SKUs
                      </span>
                    </div>
                  ))}
                  {parsedData.b2bCustomers.length > 5 && (
                    <p className="text-xs text-slate-500">
                      ... and {parsedData.b2bCustomers.length - 5} more
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
