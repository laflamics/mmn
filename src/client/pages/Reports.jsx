import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, formatCurrency } from '../lib/formatters';

export default function Reports() {
  const [selectedModule, setSelectedModule] = useState('sales_orders');
  const [allData, setAllData] = useState([]);
  const [allItemsData, setAllItemsData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState('header');
  const [error, setError] = useState('');

  const modules = [
    { id: 'sales_orders', label: 'Sales Orders', icon: '💼', table: 'sales_orders' },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: '🛒', table: 'purchase_orders' },
    { id: 'customers', label: 'Customers', icon: '👥', table: 'customers' },
    { id: 'suppliers', label: 'Suppliers', icon: '🏭', table: 'suppliers' },
    { id: 'products', label: 'Products', icon: '📦', table: 'products' },
    { id: 'inventory', label: 'Inventory', icon: '📊', table: 'inventory' },
    { id: 'payments', label: 'Payments', icon: '💳', table: 'payments' },
    { id: 'invoices', label: 'Invoices', icon: '📄', table: 'invoices' },
    { id: 'users', label: 'Users', icon: '👤', table: 'users' },
    { id: 'stock_receives', label: 'Stock Receives', icon: '📥', table: 'stock_receives' },
    { id: 'delivery_notes', label: 'Delivery Notes', icon: '📋', table: 'delivery_notes' },
    { id: 'purchasing_reminders', label: 'Purchasing Reminders', icon: '🔔', table: 'purchasing_reminders' },
  ];

  useEffect(() => {
    setCurrentPage(1);
    fetchData();
  }, [selectedModule]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const module = modules.find(m => m.id === selectedModule);
      let headerData = [];
      let itemsDataResult = [];

      try {
        // Handle modules with related items
        if (selectedModule === 'sales_orders') {
          // First try to get all data without specifying columns
          const { data: orders, error: err } = await supabase
            .from('sales_orders')
            .select('*')
            .limit(10000);

          if (err) throw err;

          // Then try to get items with product info
          let itemsMap = {};
          try {
            const { data: items } = await supabase
              .from('sales_order_items')
              .select(`
                *,
                products(id, name, sku)
              `)
              .limit(10000);
            
            if (items) {
              items.forEach(item => {
                if (!itemsMap[item.sales_order_id]) {
                  itemsMap[item.sales_order_id] = [];
                }
                itemsMap[item.sales_order_id].push(item);
              });
            }
          } catch (e) {
            console.log('Could not fetch sales_order_items with products');
            // Fallback: try without product join
            try {
              const { data: items } = await supabase
                .from('sales_order_items')
                .select('*')
                .limit(10000);
              
              if (items) {
                items.forEach(item => {
                  if (!itemsMap[item.sales_order_id]) {
                    itemsMap[item.sales_order_id] = [];
                  }
                  itemsMap[item.sales_order_id].push(item);
                });
              }
            } catch (e2) {
              console.log('Could not fetch sales_order_items');
            }
          }

          headerData = orders?.map(order => ({
            ...order,
            item_count: itemsMap[order.id]?.length || 0
          })) || [];

          itemsDataResult = [];
          orders?.forEach(order => {
            const items = itemsMap[order.id] || [];
            if (items.length > 0) {
              items.forEach(item => {
                itemsDataResult.push({
                  order_id: order.id,
                  order_number: order.order_number || order.so_number || order.id,
                  item_id: item.id,
                  product_id: item.product_id,
                  product_name: item.products?.name || '-',
                  product_sku: item.products?.sku || '-',
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  total_price: item.total_price
                });
              });
            }
          });
        } else if (selectedModule === 'purchase_orders') {
          // First try to get all data without specifying columns
          const { data: orders, error: err } = await supabase
            .from('purchase_orders')
            .select('*')
            .limit(10000);

          if (err) throw err;

          // Then try to get items with product info
          let itemsMap = {};
          try {
            const { data: items } = await supabase
              .from('purchase_order_items')
              .select(`
                *,
                products(id, name, sku)
              `)
              .limit(10000);
            
            if (items) {
              items.forEach(item => {
                if (!itemsMap[item.purchase_order_id]) {
                  itemsMap[item.purchase_order_id] = [];
                }
                itemsMap[item.purchase_order_id].push(item);
              });
            }
          } catch (e) {
            console.log('Could not fetch purchase_order_items with products');
            // Fallback: try without product join
            try {
              const { data: items } = await supabase
                .from('purchase_order_items')
                .select('*')
                .limit(10000);
              
              if (items) {
                items.forEach(item => {
                  if (!itemsMap[item.purchase_order_id]) {
                    itemsMap[item.purchase_order_id] = [];
                  }
                  itemsMap[item.purchase_order_id].push(item);
                });
              }
            } catch (e2) {
              console.log('Could not fetch purchase_order_items');
            }
          }

          headerData = orders?.map(order => ({
            ...order,
            item_count: itemsMap[order.id]?.length || 0
          })) || [];

          itemsDataResult = [];
          orders?.forEach(order => {
            const items = itemsMap[order.id] || [];
            if (items.length > 0) {
              items.forEach(item => {
                itemsDataResult.push({
                  order_id: order.id,
                  order_number: order.order_number || order.po_number || order.id,
                  item_id: item.id,
                  product_id: item.product_id,
                  product_name: item.products?.name || '-',
                  product_sku: item.products?.sku || '-',
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  total_price: item.total_price
                });
              });
            }
          });
        } else {
          const { data: queryResult, error: err } = await supabase
            .from(module.table)
            .select('*')
            .limit(10000);

          if (err) throw err;
          headerData = queryResult || [];
        }
      } catch (err) {
        throw new Error(`Failed to fetch ${module.label}: ${err.message}`);
      }

      setAllData(headerData);
      setAllItemsData(itemsDataResult);
      setPreviewTab('header');
    } catch (err) {
      setError(`Error loading data: ${err.message}`);
      setAllData([]);
      setAllItemsData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const module = modules.find(m => m.id === selectedModule);
    const exportData = previewTab === 'items' && allItemsData.length > 0 ? allItemsData : allData;

    if (exportData.length === 0) {
      alert('No data to export');
      return;
    }

    // Get all unique keys from all rows
    const allKeys = new Set();
    exportData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (typeof row[key] !== 'object' || row[key] === null) {
          allKeys.add(key);
        }
      });
    });
    
    const headers = Array.from(allKeys);
    const csv = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const suffix = previewTab === 'items' ? '-items' : '';
    link.setAttribute('download', `${module.label.toLowerCase().replace(/\s+/g, '-')}${suffix}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = async () => {
    const exportData = previewTab === 'items' && allItemsData.length > 0 ? allItemsData : allData;

    if (exportData.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const module = modules.find(m => m.id === selectedModule);
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      const sheetName = previewTab === 'items' ? `${module.label} Items` : module.label;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      const suffix = previewTab === 'items' ? '-items' : '';
      XLSX.writeFile(wb, `${module.label.toLowerCase().replace(/\s+/g, '-')}${suffix}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert('Please install xlsx library: npm install xlsx');
    }
  };

  const currentModule = modules.find(m => m.id === selectedModule);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-2">Data Export</h1>
        <p className="text-slate-400">Select a module to preview and export data</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Module Selection Dropdown */}
      <div className="mb-8 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Module</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 hover:border-slate-500 focus:border-blue-500 focus:outline-none transition-smooth"
          >
            {modules.map(module => (
              <option key={module.id} value={module.id}>
                {module.icon} {module.label}
              </option>
            ))}
          </select>
        </div>

        {/* Page Size Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Per Page</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 hover:border-slate-500 focus:border-blue-500 focus:outline-none transition-smooth"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setShowPreview(!showPreview)}
          disabled={loading || allData.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 disabled:opacity-50 rounded-lg transition-smooth font-medium border border-blue-500/50"
        >
          � ️ {showPreview ? 'Hide' : 'View'} Preview
        </button>
        <button
          onClick={exportToCSV}
          disabled={loading || allData.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-green-500/30 text-green-200 hover:bg-green-500/50 disabled:opacity-50 rounded-lg transition-smooth font-medium border border-green-500/50"
        >
          📊 Export CSV
        </button>
        <button
          onClick={exportToExcel}
          disabled={loading || allData.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500/30 text-orange-200 hover:bg-orange-500/50 disabled:opacity-50 rounded-lg transition-smooth font-medium border border-orange-500/50"
        >
          📈 Export Excel
        </button>
      </div>

      {/* Data Stats */}
      {allData.length > 0 && (
        <div className="glass rounded-xl p-4 border border-slate-700 mb-8">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Records</p>
              <p className="text-2xl font-bold text-blue-400">{allData.length.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Columns</p>
              <p className="text-2xl font-bold text-green-400">{Object.keys(allData[0]).length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Module</p>
              <p className="text-2xl font-bold text-purple-400">{currentModule?.label}</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {showPreview && allData.length > 0 && (
        <div className="glass rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-white/5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Data Preview - {currentModule?.label}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {previewTab === 'items' && allItemsData.length > 0
                    ? `Showing ${Math.min(pageSize, allItemsData.length)} of ${allItemsData.length} line items`
                    : `Showing ${Math.min(pageSize, allData.length)} of ${allData.length} records`}
                </p>
              </div>
            </div>
            
            {/* Tabs */}
            {(selectedModule === 'sales_orders' || selectedModule === 'purchase_orders') && allItemsData.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPreviewTab('header');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
                    previewTab === 'header'
                      ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  📋 Header ({allData.length})
                </button>
                <button
                  onClick={() => {
                    setPreviewTab('items');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
                    previewTab === 'items'
                      ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  📦 Items ({allItemsData.length})
                </button>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-slate-700">
                <tr>
                  {Object.keys(previewTab === 'items' && allItemsData.length > 0 ? allItemsData[0] : allData[0]).map(key => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-300 whitespace-nowrap"
                    >
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const displayData = previewTab === 'items' && allItemsData.length > 0 ? allItemsData : allData;
                  const start = (currentPage - 1) * pageSize;
                  const end = start + pageSize;
                  const paginatedData = displayData.slice(start, end);

                  return paginatedData.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                          {value === null || value === undefined ? (
                            <span className="text-slate-500">-</span>
                          ) : typeof value === 'boolean' ? (
                            <span className={value ? 'text-green-400' : 'text-red-400'}>
                              {value ? 'Yes' : 'No'}
                            </span>
                          ) : typeof value === 'number' && key.includes('amount') ? (
                            <span className="text-green-400">{formatCurrency(value)}</span>
                          ) : typeof value === 'number' && key.includes('quantity') ? (
                            <span className="text-blue-400">{value}</span>
                          ) : typeof value === 'string' && (key.includes('date') || key.includes('created') || key.includes('updated')) ? (
                            <span className="text-slate-400">{formatDate(value)}</span>
                          ) : (
                            <span className="truncate max-w-xs" title={String(value)}>
                              {String(value).substring(0, 50)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-700 bg-white/5 flex justify-between items-center">
            <p className="text-sm text-slate-400">
              Page {currentPage} of {Math.ceil((previewTab === 'items' && allItemsData.length > 0 ? allItemsData.length : allData.length) / pageSize)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded disabled:opacity-50 hover:bg-slate-700 transition-smooth text-sm"
              >
                ← Prev
              </button>
              <button
                onClick={() => {
                  const maxPage = Math.ceil((previewTab === 'items' && allItemsData.length > 0 ? allItemsData.length : allData.length) / pageSize);
                  setCurrentPage(p => Math.min(maxPage, p + 1));
                }}
                disabled={currentPage >= Math.ceil((previewTab === 'items' && allItemsData.length > 0 ? allItemsData.length : allData.length) / pageSize)}
                className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded disabled:opacity-50 hover:bg-slate-700 transition-smooth text-sm"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-400 mt-4">Loading data...</p>
        </div>
      )}

      {!loading && allData.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-slate-400">No data available for this module</p>
        </div>
      )}
    </div>
  );
}
