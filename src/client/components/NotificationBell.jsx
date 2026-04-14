import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('purchasing_reminders')
        .select(`
          *,
          products(sku, name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data);
      setUnreadCount(data.length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleAcknowledge = async (reminderId) => {
    try {
      const { error } = await supabase
        .from('purchasing_reminders')
        .update({ status: 'acknowledged' })
        .eq('id', reminderId);

      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      console.error('Error acknowledging notification:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-400 hover:text-white transition-smooth"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-50">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-semibold">Stock Shortage Alerts</h3>
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-slate-400">
              No pending alerts
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4 border-b border-slate-700 hover:bg-slate-700/50 transition-smooth">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{notif.products.name}</p>
                      <p className="text-slate-400 text-xs">
                        SKU: {notif.products.sku}
                      </p>
                      <p className="text-orange-300 text-xs font-semibold mt-1">
                        Shortage: {notif.shortage_qty} {notif.uom}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcknowledge(notif.id)}
                      className="px-2 py-1 bg-orange-500/30 text-orange-200 hover:bg-orange-500/50 rounded text-xs font-medium transition-smooth whitespace-nowrap"
                    >
                      Ack
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-slate-700 text-center">
            <a href="/purchasing" className="text-blue-400 hover:text-blue-300 text-xs font-medium">
              View all reminders →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
