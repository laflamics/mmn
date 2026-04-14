import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { useTheme } from '../context/ThemeContext';
import { uploadDocument, deleteDocument } from '../lib/storage';
import DataImportDialog from '../components/DataImportDialog';
import AppUpdater from '../components/AppUpdater';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { currentTheme, changeTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    company_name: '',
    email: '',
    phone: '',
    address: '',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    prepared_by_signature_url: '',
    prepared_by_signature_name: '',
    prepared_by_name: '',
    prepared_by_position: '',
    approved_by_signature_url: '',
    approved_by_signature_name: '',
    approved_by_name: '',
    approved_by_position: '',
    enable_plafond_blocking: false
  });
  const [uploading, setUploading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    loadSettings();
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected for new users
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettings({
          company_name: data.company_name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          currency: data.currency || 'IDR',
          timezone: data.timezone || 'Asia/Jakarta',
          bank_name: data.bank_name || '',
          bank_account_number: data.bank_account_number || '',
          bank_account_name: data.bank_account_name || '',
          prepared_by_signature_url: data.prepared_by_signature_url || '',
          prepared_by_signature_name: data.prepared_by_signature_name || '',
          prepared_by_name: data.prepared_by_name || '',
          prepared_by_position: data.prepared_by_position || '',
          approved_by_signature_url: data.approved_by_signature_url || '',
          approved_by_signature_name: data.approved_by_signature_name || '',
          approved_by_name: data.approved_by_name || '',
          approved_by_position: data.approved_by_position || '',
          enable_plafond_blocking: data.enable_plafond_blocking || false
        });
      }
    } catch (err) {
      console.log('No settings found, using defaults');
    }
  };

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

  const handleSignatureUpload = async (e, signatureType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { url, name } = await uploadDocument(file);
      setSettings(prev => ({
        ...prev,
        [`${signatureType}_signature_url`]: url,
        [`${signatureType}_signature_name`]: name
      }));
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSignature = async (signatureType) => {
    try {
      setUploading(true);
      const url = settings[`${signatureType}_signature_url`];
      if (url) {
        const path = url.split('/').slice(-2).join('/');
        await deleteDocument(`documents/${path}`);
      }
      setSettings(prev => ({
        ...prev,
        [`${signatureType}_signature_url`]: '',
        [`${signatureType}_signature_name`]: ''
      }));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleThemeChange = (themeId) => {
    changeTheme(themeId);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        user_id: user.id,
        company_name: settings.company_name,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
        currency: settings.currency,
        timezone: settings.timezone,
        bank_name: settings.bank_name,
        bank_account_number: settings.bank_account_number,
        bank_account_name: settings.bank_account_name,
        prepared_by_signature_url: settings.prepared_by_signature_url,
        prepared_by_name: settings.prepared_by_name,
        prepared_by_position: settings.prepared_by_position,
        approved_by_signature_url: settings.approved_by_signature_url,
        approved_by_name: settings.approved_by_name,
        approved_by_position: settings.approved_by_position,
        enable_plafond_blocking: settings.enable_plafond_blocking
      };

      // First try to get existing record
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from('company_settings')
          .update(payload)
          .eq('user_id', user.id)
          .select();
      } else {
        // Insert new
        result = await supabase
          .from('company_settings')
          .insert([payload])
          .select();
      }

      const { error } = result;

      if (error) throw error;

      setMessage('✓ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('✗ Error: ' + (err.message || 'Failed to save settings'));
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'theme', label: 'Theme', icon: '🎨' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'import', label: 'Import Data', icon: '📥' },
    { id: 'update', label: 'Update', icon: '🔄' },
  ];

  const getTextColor = () => {
    return currentTheme.id === 'light' ? 'text-gray-900' : 'text-white';
  };

  const getLabelColor = () => {
    return currentTheme.id === 'light' ? 'text-gray-800' : 'text-cyan-300';
  };

  const getMenuItemColor = () => {
    if (currentTheme.id === 'light') {
      return 'text-gray-700 hover:bg-gray-200';
    }
    return 'text-cyan-200/70 hover:bg-cyan-500/10';
  };

  const getMenuItemActiveColor = () => {
    if (currentTheme.id === 'light') {
      return 'bg-gray-200 text-gray-900 font-medium';
    }
    return 'bg-cyan-500/30 text-cyan-200 font-medium';
  };

  return (
    <div>
      <h1 className={`text-2xl md:text-4xl font-bold gradient-text mb-6 md:mb-8 ${getTextColor()}`}>Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Settings Menu */}
        <div className="glass rounded-lg md:rounded-xl p-4 md:p-6 h-fit">
          <h2 className={`text-base md:text-lg font-bold ${getTextColor()} mb-3 md:mb-4`}>Settings</h2>
          <div className="space-y-1 md:space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-3 md:px-4 py-2 md:py-2 rounded-lg transition-smooth flex items-center space-x-2 text-xs md:text-sm ${
                  activeTab === item.id
                    ? getMenuItemActiveColor()
                    : getMenuItemColor()
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
            <div className="glass rounded-lg md:rounded-xl p-4 md:p-6">
              <h2 className={`text-lg md:text-xl font-bold ${getTextColor()} mb-4 md:mb-6`}>General Settings</h2>

              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className={`block text-xs md:text-sm font-medium ${getLabelColor()} mb-2`}>Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    value={settings.company_name}
                    onChange={handleChange}
                    className={`w-full px-3 md:px-4 py-2 md:py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className={`block text-xs md:text-sm font-medium ${getLabelColor()} mb-2`}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={settings.email}
                      onChange={handleChange}
                      className={`w-full px-3 md:px-4 py-2 md:py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs md:text-sm font-medium ${getLabelColor()} mb-2`}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={settings.phone}
                      onChange={handleChange}
                      className={`w-full px-3 md:px-4 py-2 md:py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs md:text-sm font-medium ${getLabelColor()} mb-2`}>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={settings.address}
                    onChange={handleChange}
                    className={`w-full px-3 md:px-4 py-2 md:py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className={`block text-xs md:text-sm font-medium ${getLabelColor()} mb-2`}>Currency</label>
                    <select
                      name="currency"
                      value={settings.currency}
                      onChange={handleChange}
                      className={`w-full px-3 md:px-4 py-2 md:py-2 glass-sm rounded-lg ${getTextColor()} focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base`}
                    >
                      <option className="bg-slate-800">IDR</option>
                      <option className="bg-slate-800">USD</option>
                      <option className="bg-slate-800">EUR</option>
                      <option className="bg-slate-800">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs md:text-sm font-medium ${getLabelColor()} mb-2`}>Timezone</label>
                    <select
                      name="timezone"
                      value={settings.timezone}
                      onChange={handleChange}
                      className={`w-full px-3 md:px-4 py-2 md:py-2 glass-sm rounded-lg ${getTextColor()} focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base`}
                    >
                      <option className="bg-slate-800">Asia/Jakarta</option>
                      <option className="bg-slate-800">UTC</option>
                      <option className="bg-slate-800">EST</option>
                      <option className="bg-slate-800">PST</option>
                    </select>
                  </div>
                </div>

                {/* Bank Information Section */}
                <div className={`border-t ${currentTheme.id === 'light' ? 'border-gray-300' : 'border-cyan-500/20'} pt-6 mt-6`}>
                  <h3 className={`text-lg font-bold ${getTextColor()} mb-4`}>Bank Information</h3>
                  
                  <div>
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Bank Name</label>
                    <input
                      type="text"
                      name="bank_name"
                      value={settings.bank_name}
                      onChange={handleChange}
                      placeholder="e.g., BCA, Mandiri, BNI"
                      className={`w-full px-4 py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-4`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Account Number</label>
                    <input
                      type="text"
                      name="bank_account_number"
                      value={settings.bank_account_number}
                      onChange={handleChange}
                      placeholder="e.g., 1234567890"
                      className={`w-full px-4 py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-4`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Account Name (A/N)</label>
                    <input
                      type="text"
                      name="bank_account_name"
                      value={settings.bank_account_name}
                      onChange={handleChange}
                      placeholder="e.g., PT. BINSIS INDONESIA"
                      className={`w-full px-4 py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-4`}
                    />
                  </div>
                </div>
                <div className={`border-t ${currentTheme.id === 'light' ? 'border-gray-300' : 'border-cyan-500/20'} pt-6 mt-6`}>
                  <h3 className={`text-lg font-bold ${getTextColor()} mb-4`}>Signatures</h3>
                  
                  {/* Prepared By */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Prepared By (PIC) Name</label>
                    <input
                      type="text"
                      name="prepared_by_name"
                      value={settings.prepared_by_name}
                      onChange={handleChange}
                      placeholder="Enter name"
                      className={`w-full px-4 py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-2`}
                    />
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Position</label>
                    <input
                      type="text"
                      name="prepared_by_position"
                      value={settings.prepared_by_position}
                      onChange={handleChange}
                      placeholder="e.g., Purchasing Officer"
                      className={`w-full px-4 py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-2`}
                    />
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Prepared By Signature</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        onChange={(e) => handleSignatureUpload(e, 'prepared_by')}
                        disabled={uploading}
                        className={`flex-1 px-4 py-2 glass-sm rounded-lg ${getTextColor()} text-sm`}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                      {uploading && <span className={`${currentTheme.id === 'light' ? 'text-gray-600' : 'text-cyan-400'} text-sm`}>Uploading...</span>}
                    </div>
                    {settings.prepared_by_signature_name && (
                      <div className={`mt-2 p-2 ${currentTheme.id === 'light' ? 'bg-gray-200' : 'bg-cyan-500/20'} rounded-lg flex justify-between items-center`}>
                        <span className={`text-sm ${currentTheme.id === 'light' ? 'text-gray-700' : 'text-cyan-300'}`}>✓ {settings.prepared_by_signature_name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSignature('prepared_by')}
                          disabled={uploading}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Approved By */}
                  <div>
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Approved By (Manager) Name</label>
                    <input
                      type="text"
                      name="approved_by_name"
                      value={settings.approved_by_name}
                      onChange={handleChange}
                      placeholder="Enter name"
                      className={`w-full px-4 py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-2`}
                    />
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Position</label>
                    <input
                      type="text"
                      name="approved_by_position"
                      value={settings.approved_by_position}
                      onChange={handleChange}
                      placeholder="e.g., Manager"
                      className={`w-full px-4 py-2 glass-sm rounded-lg ${getTextColor()} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-2`}
                    />
                    <label className={`block text-sm font-medium ${getLabelColor()} mb-2`}>Approved By Signature</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        onChange={(e) => handleSignatureUpload(e, 'approved_by')}
                        disabled={uploading}
                        className={`flex-1 px-4 py-2 glass-sm rounded-lg ${getTextColor()} text-sm`}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                      {uploading && <span className={`${currentTheme.id === 'light' ? 'text-gray-600' : 'text-cyan-400'} text-sm`}>Uploading...</span>}
                    </div>
                    {settings.approved_by_signature_name && (
                      <div className={`mt-2 p-2 ${currentTheme.id === 'light' ? 'bg-gray-200' : 'bg-cyan-500/20'} rounded-lg flex justify-between items-center`}>
                        <span className={`text-sm ${currentTheme.id === 'light' ? 'text-gray-700' : 'text-cyan-300'}`}>✓ {settings.approved_by_signature_name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSignature('approved_by')}
                          disabled={uploading}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 btn-gradient-success text-white rounded-lg transition-smooth font-medium disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className={`px-6 py-2 glass-sm ${currentTheme.id === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-cyan-300 hover:text-cyan-100'} rounded-lg transition-smooth font-medium`}>
                    Cancel
                  </button>
                </div>
                {message && (
                  <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                    message.includes('✓') 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Theme Settings */}
          {activeTab === 'theme' && (
            <div className="glass rounded-xl p-6">
              <h2 className={`text-xl font-bold ${getTextColor()} mb-6`}>Choose Your Theme</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-smooth border-2 ${
                      currentTheme.id === theme.id
                        ? currentTheme.id === 'light' ? 'border-gray-400 bg-gray-100' : 'border-cyan-400 bg-cyan-500/10'
                        : currentTheme.id === 'light' ? 'border-gray-300 hover:border-gray-400' : 'border-cyan-500/20 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className={`${theme.preview} h-20 rounded-lg mb-3`}></div>
                    <h3 className={`${getTextColor()} font-semibold`}>{theme.name}</h3>
                    <p className={`${currentTheme.id === 'light' ? 'text-gray-600' : 'text-cyan-300/70'} text-sm`}>{theme.description}</p>
                    {currentTheme.id === theme.id && (
                      <div className={`mt-3 text-sm font-medium ${currentTheme.id === 'light' ? 'text-gray-700' : 'text-cyan-400'}`}>✓ Applied</div>
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
              <h2 className={`text-xl font-bold ${getTextColor()} mb-6`}>Security & Business Rules</h2>
              <div className="space-y-4">
                {/* Plafond Blocking */}
                <div className={`p-4 glass-sm rounded-lg flex items-center justify-between ${currentTheme.id === 'light' ? 'hover:bg-gray-100' : 'hover:bg-cyan-500/10'} transition-smooth`}>
                  <div>
                    <h3 className={`${getTextColor()} font-semibold`}>Block Orders Over Plafond Limit</h3>
                    <p className={`${currentTheme.id === 'light' ? 'text-gray-600' : 'text-cyan-300/70'} text-sm`}>
                      {settings.enable_plafond_blocking 
                        ? '✓ Enabled - Orders will be blocked if they exceed customer plafond limit' 
                        : '○ Disabled - Orders can exceed plafond limit (warning only)'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, enable_plafond_blocking: !settings.enable_plafond_blocking })}
                    className={`px-4 py-2 rounded-lg font-medium transition-smooth ${
                      settings.enable_plafond_blocking
                        ? 'bg-green-500/30 text-green-200 hover:bg-green-500/50'
                        : 'bg-slate-600/30 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {settings.enable_plafond_blocking ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className={`border-t ${currentTheme.id === 'light' ? 'border-gray-300' : 'border-cyan-500/20'} pt-4 mt-4`}>
                  <button className={`w-full p-4 glass-sm rounded-lg text-left ${currentTheme.id === 'light' ? 'hover:bg-gray-100' : 'hover:bg-cyan-500/10'} transition-smooth`}>
                    <h3 className={`${getTextColor()} font-semibold`}>Change Password</h3>
                    <p className={`${currentTheme.id === 'light' ? 'text-gray-600' : 'text-cyan-300/70'} text-sm`}>Update your password regularly</p>
                  </button>
                  <button className={`w-full p-4 glass-sm rounded-lg text-left ${currentTheme.id === 'light' ? 'hover:bg-gray-100' : 'hover:bg-cyan-500/10'} transition-smooth`}>
                    <h3 className={`${getTextColor()} font-semibold`}>Two-Factor Authentication</h3>
                    <p className={`${currentTheme.id === 'light' ? 'text-gray-600' : 'text-cyan-300/70'} text-sm`}>Enable 2FA for extra security</p>
                  </button>
                  <button className={`w-full p-4 glass-sm rounded-lg text-left ${currentTheme.id === 'light' ? 'hover:bg-gray-100' : 'hover:bg-cyan-500/10'} transition-smooth`}>
                    <h3 className={`${getTextColor()} font-semibold`}>Active Sessions</h3>
                    <p className={`${currentTheme.id === 'light' ? 'text-gray-600' : 'text-cyan-300/70'} text-sm`}>Manage your active sessions</p>
                  </button>
                </div>

                <div className="flex space-x-4 pt-4 mt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 btn-gradient-success text-white rounded-lg transition-smooth font-medium disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
                {message && (
                  <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                    message.includes('✓') 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="glass rounded-xl p-6">
              <h2 className={`text-xl font-bold ${getTextColor()} mb-6`}>Notification Settings</h2>
              <div className="space-y-4">
                {['Email Notifications', 'Order Updates', 'Payment Alerts', 'System Alerts'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 glass-sm rounded-lg">
                    <span className={getTextColor()}>{item}</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Data */}
          {activeTab === 'update' && (
            <div className="glass rounded-xl p-6">
              <h2 className={`text-xl font-bold ${getTextColor()} mb-6`}>Update Aplikasi</h2>
              <AppUpdater />
            </div>
          )}

          {activeTab === 'import' && (
            <div className="glass rounded-xl p-6">
              <h2 className={`text-xl font-bold ${getTextColor()} mb-6`}>Import Data</h2>
              <div className="space-y-4">
                <p className={`text-sm ${currentTheme.id === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                  Import B2C/B2B pricing data and customer information from CSV file.
                </p>
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
                >
                  📥 Import CSV File
                </button>
                <div className={`p-4 glass-sm rounded-lg text-sm ${currentTheme.id === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                  <p className="font-semibold mb-2">Supported Format:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>B2C Default Pricing (Locco/Franco prices per SKU)</li>
                    <li>B2C Customer Custom Pricing</li>
                    <li>B2B Customer Custom Pricing</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      <DataImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={() => {
          // Refresh or show success message
          alert('Data imported successfully!');
        }}
      />
    </div>
  );
}