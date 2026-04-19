import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import Table from '../components/Table';
import Dialog from '../components/Dialog';
import NumberInput from '../components/NumberInput';

export default function DatabaseServer() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const allTables = [
    // Core tables
    'products', 'customers', 'suppliers', 'users',
    // Inventory & Stock
    'inventory', 'stock_receives', 'stock_receive_items',
    // Sales
    'sales_orders', 'sales_order_items', 'delivery_notes', 'delivery_note_items',
    // Purchasing
    'purchase_orders', 'purchase_order_items', 'purchasing_reminders',
    // Financial
    'invoices', 'invoice_items', 'payments', 'payment_items',
    // Settings & Permissions
    'company_settings', 'customer_product_pricing', 'permissions', 'user_permissions'
  ];

  useEffect(() => {
    setTables(allTables);
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const fetchTableData = async (tableName) => {
    try {
      setLoading(true);
      setError('');
      setSelectedRows(new Set());
      
      const { data, error: err } = await supabase
        .from(tableName)
        .select('*')
        .limit(1000);

      if (err) {
        if (err.code === 'PGRST116' || err.message.includes('Could not find the table')) {
          setError(`Table "${tableName}" does not exist in database yet`);
          setTableData([]);
        } else {
          throw err;
        }
      } else {
        setTableData(data || []);
      }
      setSelectedTable(tableName);
    } catch (err) {
      setError(`Error loading ${tableName}: ${err.message}`);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRow = (rowId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === tableData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(tableData.map((_, idx) => idx)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) {
      setError('No rows selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedRows.size} row(s)? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const rowsToDelete = Array.from(selectedRows).map(idx => tableData[idx]);
      
      // Delete rows by ID
      const ids = rowsToDelete.map(row => row.id).filter(Boolean);
      if (ids.length > 0) {
        const { error: err } = await supabase
          .from(selectedTable)
          .delete()
          .in('id', ids);

        if (err) throw err;
      }

      setError('');
      setSelectedRows(new Set());
      await fetchTableData(selectedTable);
    } catch (err) {
      setError(`Error deleting rows: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRow = (row) => {
    setEditingRow(row);
    setEditFormData({ ...row });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const { id, ...updateData } = editFormData;

      const { error: err } = await supabase
        .from(selectedTable)
        .update(updateData)
        .eq('id', id);

      if (err) throw err;

      setError('');
      setShowEditDialog(false);
      setEditingRow(null);
      await fetchTableData(selectedTable);
    } catch (err) {
      setError(`Error updating row: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getColumns = () => {
    if (tableData.length === 0) return [];
    
    const firstRow = tableData[0];
    const keys = Object.keys(firstRow);
    
    return [
      {
        key: 'select',
        label: (
          <input
            type="checkbox"
            checked={selectedRows.size === tableData.length && tableData.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4"
          />
        ),
        width: '5%',
        render: (_, row, idx) => (
          <input
            type="checkbox"
            checked={selectedRows.has(idx)}
            onChange={() => handleSelectRow(idx)}
            className="w-4 h-4"
          />
        )
      },
      ...keys.slice(0, 8).map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        width: '10%',
        render: (val) => {
          if (val === null) return '-';
          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
          if (typeof val === 'object') return JSON.stringify(val).substring(0, 50);
          if (typeof val === 'number' && key.includes('price') || key.includes('amount')) {
            return formatCurrency(val);
          }
          if (typeof val === 'string' && val.includes('T')) {
            return formatDate(val);
          }
          return String(val).substring(0, 50);
        }
      })),
      {
        key: 'actions',
        label: 'Actions',
        width: '10%',
        render: (_, row) => (
          <button
            onClick={() => handleEditRow(row)}
            className="px-2 py-1 text-xs bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth font-medium"
          >
            Edit
          </button>
        )
      }
    ];
  };

  return (
    <div>
      <h1 className="text-4xl font-bold gradient-text mb-8">Database Server</h1>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        {/* Table List */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Tables</h2>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {tables.map(table => (
                <button
                  key={table}
                  onClick={() => fetchTableData(table)}
                  className={`w-full text-left px-3 py-2 rounded text-xs transition-smooth ${
                    selectedTable === table
                      ? 'bg-blue-500/50 text-blue-100 font-medium'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data View */}
        <div className="lg:col-span-3">
          {selectedTable ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">
                  {selectedTable} ({tableData.length} rows)
                </h2>
                {selectedRows.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500/30 text-red-200 hover:bg-red-500/50 disabled:opacity-50 rounded-lg transition-smooth font-medium text-sm"
                  >
                    Delete {selectedRows.size} row(s)
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Loading...</p>
                </div>
              ) : tableData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">No data in this table</p>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
                  <Table columns={getColumns()} data={tableData} rowsPerPage={20} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">Select a table to view data</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        isOpen={showEditDialog}
        title={`Edit ${selectedTable}`}
        onClose={() => setShowEditDialog(false)}
        onSubmit={handleSaveEdit}
        submitLabel="Save Changes"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {editingRow && Object.entries(editingRow).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
              {key === 'id' ? (
                <input
                  type="text"
                  value={value}
                  disabled
                  className="w-full px-3 py-1.5 glass-sm rounded-lg text-white opacity-50 cursor-not-allowed text-xs"
                />
              ) : typeof value === 'boolean' ? (
                <select
                  value={value ? 'true' : 'false'}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    [key]: e.target.value === 'true'
                  })}
                  className="w-full px-3 py-1.5 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : typeof value === 'number' ? (
                <NumberInput
                  value={value}
                  onChange={(val) => setEditFormData({
                    ...editFormData,
                    [key]: parseFloat(val) || 0
                  })}
                  className="w-full px-3 py-1.5 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  allowDecimal={true}
                />
              ) : (
                <textarea
                  value={value || ''}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    [key]: e.target.value
                  })}
                  className="w-full px-3 py-1.5 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  rows="2"
                />
              )}
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
