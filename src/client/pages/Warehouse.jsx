import { useState } from 'react';
import Dialog from '../components/Dialog';

export default function Warehouse() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');

  const openDialog = (type) => {
    setDialogType(type);
    setShowDialog(true);
  };

  return (
    <div>
      <h1 className="text-4xl font-bold gradient-text mb-8">Warehouse & Delivery</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Incoming Shipments</h2>
          <div className="space-y-3">
            <div className="p-4 glass-sm rounded-lg">
              <p className="text-slate-300 text-sm">No incoming shipments</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Outgoing Deliveries</h2>
          <div className="space-y-3">
            <div className="p-4 glass-sm rounded-lg">
              <p className="text-slate-300 text-sm">No pending deliveries</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 glass rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Warehouse Operations</h2>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => openDialog('receive')}
            className="p-4 glass-sm rounded-lg hover:bg-white/10 transition-smooth text-slate-300 hover:text-white"
          >
            📦 Receive Stock
          </button>
          <button 
            onClick={() => openDialog('shipment')}
            className="p-4 glass-sm rounded-lg hover:bg-white/10 transition-smooth text-slate-300 hover:text-white"
          >
            🚚 Create Shipment
          </button>
          <button 
            onClick={() => openDialog('track')}
            className="p-4 glass-sm rounded-lg hover:bg-white/10 transition-smooth text-slate-300 hover:text-white"
          >
            📍 Track Delivery
          </button>
          <button 
            onClick={() => openDialog('confirm')}
            className="p-4 glass-sm rounded-lg hover:bg-white/10 transition-smooth text-slate-300 hover:text-white"
          >
            ✓ Confirm Receipt
          </button>
        </div>
      </div>

      <Dialog
        isOpen={showDialog}
        title={
          dialogType === 'receive' ? 'Receive Stock' :
          dialogType === 'shipment' ? 'Create Shipment' :
          dialogType === 'track' ? 'Track Delivery' :
          'Confirm Receipt'
        }
        onClose={() => setShowDialog(false)}
        onSubmit={() => setShowDialog(false)}
        submitLabel="Confirm"
      >
        <div className="space-y-4">
          {(dialogType === 'receive' || dialogType === 'shipment') && (
            <>
              <input
                type="text"
                placeholder="PO / Order Number"
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="date"
                className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="number"
                placeholder="Quantity"
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </>
          )}
          {(dialogType === 'track' || dialogType === 'confirm') && (
            <>
              <input
                type="text"
                placeholder="Tracking Number"
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="Carrier"
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
