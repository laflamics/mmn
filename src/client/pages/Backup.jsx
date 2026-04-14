import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/formatters';

export default function Backup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backupStats, setBackupStats] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    loadBackupStats();
    loadBackupHistory();
  }, []);

  const loadBackupStats = async () => {
    try {
      const tables = [
        'users',
        'suppliers',
        'customers',
        'products',
        'purchase_orders',
        'purchase_order_items',
        'sales_orders',
        'sales_order_items',
        'payments',
        'invoices',
        'inventory',
        'stock_receives',
        'delivery_notes',
        'purchasing_reminders'
      ];

      const stats = {};
      let totalRecords = 0;

      for (const table of tables) {
        const { count, error: err } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!err) {
          stats[table] = count || 0;
          totalRecords += count || 0;
        }
      }

      setBackupStats({ ...stats, totalRecords });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadBackupHistory = () => {
    const history = JSON.parse(localStorage.getItem('backupHistory') || '[]');
    setBackupHistory(history);
  };

  const exportBackup = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const tables = [
        'users',
        'suppliers',
        'customers',
        'products',
        'purchase_orders',
        'purchase_order_items',
        'sales_orders',
        'sales_order_items',
        'payments',
        'invoices',
        'inventory',
        'stock_receives',
        'delivery_notes',
        'purchasing_reminders'
      ];

      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {}
      };

      for (const table of tables) {
        const { data, error: err } = await supabase
          .from(table)
          .select('*');

        if (err) {
          console.error(`Error fetching ${table}:`, err);
          continue;
        }

        backup.data[table] = data || [];
      }

      // Save to localStorage history
      const history = JSON.parse(localStorage.getItem('backupHistory') || '[]');
      history.unshift({
        timestamp: backup.timestamp,
        size: JSON.stringify(backup).length,
        recordCount: Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0)
      });
      localStorage.setItem('backupHistory', JSON.stringify(history.slice(0, 10)));

      // Download backup file
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2)));
      element.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      setSuccess(`✅ Backup exported successfully! (${Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0)} records)`);
      loadBackupHistory();
      loadBackupStats();
    } catch (err) {
      setError(`❌ Error exporting backup: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllData = async (table) => {
    try {
      setLoading(true);
      setError('');

      const { error: err } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (err) throw err;

      setSuccess(`✅ All data in ${table} has been deleted!`);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      loadBackupStats();
    } catch (err) {
      setError(`❌ Error deleting data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllDataEverywhere = async () => {
    try {
      setLoading(true);
      setError('');

      const tables = [
        'purchasing_reminders',
        'delivery_notes',
        'stock_receives',
        'invoices',
        'payments',
        'sales_order_items',
        'sales_orders',
        'purchase_order_items',
        'purchase_orders',
        'inventory',
        'products',
        'customers',
        'suppliers'
      ];

      for (const table of tables) {
        const { error: err } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (err) {
          console.error(`Error deleting ${table}:`, err);
        }
      }

      setSuccess('✅ All data has been deleted from all tables!');
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      loadBackupStats();
    } catch (err) {
      setError(`❌ Error deleting all data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRestoreFile(file);
    }
  };

  const restoreFromBackup = async () => {
    if (!restoreFile) {
      setError('❌ Please select a backup file');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const text = await restoreFile.text();
      const backup = JSON.parse(text);

      if (!backup.data) {
        throw new Error('Invalid backup file format');
      }

      let totalInserted = 0;

      for (const [table, records] of Object.entries(backup.data)) {
        if (!records || records.length === 0) continue;

        // Insert in batches
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const { error: err } = await supabase
            .from(table)
            .insert(batch);

          if (err) {
            console.error(`Error inserting into ${table}:`, err);
          } else {
            totalInserted += batch.length;
          }
        }
      }

      setSuccess(`✅ Restore completed! ${totalInserted} records inserted.`);
      setShowRestoreConfirm(false);
      setRestoreFile(null);
      loadBackupStats();
    } catch (err) {
      setError(`❌ Error restoring backup: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-2">Backup & Restore</h1>
        <p className="text-slate-400">Manage your database backups and restore data</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-6 backdrop-blur-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/20 border border-green-500/30 text-green-200 rounded-lg mb-6 backdrop-blur-sm">
          {success}
        </div>
      )}

      {/* Current Data Stats */}
      {backupStats && (
        <div className="glass rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Current Database Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(backupStats)
              .filter(([key]) => key !== 'totalRecords')
              .map(([table, count]) => (
                <div key={table} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1 capitalize">{table.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold text-blue-400">{count}</p>
                </div>
              ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-300">
              <span className="font-semibold">Total Records:</span> {backupStats.totalRecords?.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Export Backup */}
        <div className="glass rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">📥 Export Backup</h3>
          <p className="text-sm text-slate-400 mb-4">
            Download all current data as a JSON file for safekeeping
          </p>
          <button
            onClick={exportBackup}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-white rounded-lg transition-smooth font-medium"
          >
            {loading ? 'Exporting...' : 'Export Now'}
          </button>
        </div>

        {/* Restore from Backup */}
        <div className="glass rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">📤 Restore Backup</h3>
          <p className="text-sm text-slate-400 mb-4">
            Upload a backup file to restore data
          </p>
          <div className="space-y-2">
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500/30 file:text-blue-200 hover:file:bg-blue-500/50"
            />
            <button
              onClick={() => setShowRestoreConfirm(true)}
              disabled={loading || !restoreFile}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white rounded-lg transition-smooth font-medium"
            >
              {loading ? 'Restoring...' : 'Restore'}
            </button>
          </div>
        </div>

        {/* Delete All Data */}
        <div className="glass rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">🗑️ Delete All Data</h3>
          <p className="text-sm text-slate-400 mb-4">
            Permanently delete all data from database
          </p>
          <button
            onClick={() => {
              setDeleteTarget('all');
              setShowDeleteConfirm(true);
            }}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 text-white rounded-lg transition-smooth font-medium"
          >
            Delete All
          </button>
        </div>
      </div>

      {/* Backup History */}
      {backupHistory.length > 0 && (
        <div className="glass rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Recent Backups</h2>
          <div className="space-y-2">
            {backupHistory.map((backup, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                <div>
                  <p className="text-sm font-semibold text-white">{formatDate(backup.timestamp)}</p>
                  <p className="text-xs text-slate-400">{backup.recordCount} records • {(backup.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">⚠️ Confirm Delete</h3>
            <p className="text-slate-300 mb-6">
              {deleteTarget === 'all'
                ? 'This will permanently delete ALL data from the database. This action cannot be undone!'
                : `This will permanently delete all data from ${deleteTarget}. This action cannot be undone!`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-lg transition-smooth font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteTarget === 'all') {
                    deleteAllDataEverywhere();
                  } else {
                    deleteAllData(deleteTarget);
                  }
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 rounded-lg transition-smooth font-medium"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">⚠️ Confirm Restore</h3>
            <p className="text-slate-300 mb-6">
              This will restore data from the backup file. Existing data will be merged with the backup data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setRestoreFile(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-lg transition-smooth font-medium"
              >
                Cancel
              </button>
              <button
                onClick={restoreFromBackup}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 rounded-lg transition-smooth font-medium"
              >
                {loading ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
