import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { currentTheme, changeTheme } = useTheme();
  const [settings, setSettings] = useState({
    companyName: 'Your Company',
    email: 'admin@company.com',
    phone: '+1 (555) 000-0000',
    address: '123 Business St',
    currency: 'USD',
    timezone: 'UTC',
  });

  const themes = [
    {
      id: 'cyber',
      name: 'Cyber',
      description: 'Modern cyan & indigo',
      preview: 'bg-gradient-to-r from-cyan-500 to-indigo-600',
    },
    {
      id: 'sunset',
      name: 'Sunset',
      description: 'Warm orange & pink',
      preview: 'bg-gradient-to-r from-orange-500 to-pink-600',
    },
    {
      id: 'forest',
      name: 'Forest',
      description: 'Fresh green & teal',
      preview: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    },
    {
      id: 'midnight',
      name: 'Midnight',
      description: 'Deep purple & blue',
      preview: 'bg-gradient-to-r from-purple-600 to-blue-700',
    },
    {
      id: 'volcano',
      name: 'Volcano',
      description: 'Hot red & orange',
      preview: 'bg-gradient-to-r from-red-500 to-orange-600',
    },
    {
      id: 'ocean',
      name: 'Ocean',
      description: 'Cool blue & cyan',
      preview: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    },
    {
      id: 'aurora',
      name: 'Aurora',
      description: 'Mystical green & purple',
      preview: 'bg-gradient-to-r from-green-500 to-purple-600',
    },
    {
      id: 'sakura',
      name: 'Sakura',
      description: 'Soft pink & rose',
      preview: 'bg-gradient-to-r from-pink-400 to-rose-600',
    },
    {
      id: 'light',
      name: 'Light',
      description: 'Clean white & gray',
      preview: 'bg-gradient-to-r from-gray-200 to-gray-300',
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  const handleThemeChange = (themeId) => {
    changeTheme(themeId);
  };

  const handleSave = () => {
    console.log('Settings saved:', settings);
  };

  const menuItems = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'theme', label: 'Theme', icon: '🎨' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold gradient-text mb-8">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Menu */}
        <div className="glass rounded-xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4">Settings</h2>
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-smooth flex items-center space-x-2 ${
                  activeTab === item.id
                    ? 'bg-cyan-500/30 text-cyan-200 font-medium'
                    : 'text-cyan-200/70 hover:bg-cyan-500/10'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">General Settings</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={settings.companyName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={settings.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={settings.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={settings.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">Currency</label>
                    <select
                      name="currency"
                      value={settings.currency}
                      onChange={handleChange}
                      className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option className="bg-slate-800">USD</option>
                      <option className="bg-slate-800">EUR</option>
                      <option className="bg-slate-800">GBP</option>
                      <option className="bg-slate-800">IDR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">Timezone</label>
                    <select
                      name="timezone"
                      value={settings.timezone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option className="bg-slate-800">UTC</option>
                      <option className="bg-slate-800">EST</option>
                      <option className="bg-slate-800">PST</option>
                      <option className="bg-slate-800">WIB</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 btn-gradient-success text-white rounded-lg transition-smooth font-medium"
                  >
                    Save Changes
                  </button>
                  <button className="px-6 py-2 glass-sm text-cyan-300 hover:text-cyan-100 rounded-lg transition-smooth font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Theme Settings */}
          {activeTab === 'theme' && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Choose Your Theme</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-smooth border-2 ${
                      currentTheme.id === theme.id
                        ? 'border-cyan-400 bg-cyan-500/10'
                        : 'border-cyan-500/20 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className={`${theme.preview} h-20 rounded-lg mb-3`}></div>
                    <h3 className="text-white font-semibold">{theme.name}</h3>
                    <p className="text-cyan-300/70 text-sm">{theme.description}</p>
                    {currentTheme.id === theme.id && (
                      <div className="mt-3 text-cyan-400 text-sm font-medium">✓ Applied</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex space-x-4 pt-6 mt-6 border-t border-cyan-500/20">
                <button
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium"
                >
                  Theme Applied
                </button>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>
              <div className="space-y-4">
                <button className="w-full p-4 glass-sm rounded-lg text-left hover:bg-cyan-500/10 transition-smooth">
                  <h3 className="text-white font-semibold">Change Password</h3>
                  <p className="text-cyan-300/70 text-sm">Update your password regularly</p>
                </button>
                <button className="w-full p-4 glass-sm rounded-lg text-left hover:bg-cyan-500/10 transition-smooth">
                  <h3 className="text-white font-semibold">Two-Factor Authentication</h3>
                  <p className="text-cyan-300/70 text-sm">Enable 2FA for extra security</p>
                </button>
                <button className="w-full p-4 glass-sm rounded-lg text-left hover:bg-cyan-500/10 transition-smooth">
                  <h3 className="text-white font-semibold">Active Sessions</h3>
                  <p className="text-cyan-300/70 text-sm">Manage your active sessions</p>
                </button>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Notification Settings</h2>
              <div className="space-y-4">
                {['Email Notifications', 'Order Updates', 'Payment Alerts', 'System Alerts'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 glass-sm rounded-lg">
                    <span className="text-white">{item}</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
