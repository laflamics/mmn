import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Detect runtime platform
const isElectron  = typeof window !== 'undefined' && !!window.electronAPI;
const isCapacitor = typeof window !== 'undefined' && !!(window.Capacitor?.isNativePlatform?.());
const isAndroid   = isCapacitor && window.Capacitor?.getPlatform?.() === 'android';

/**
 * Compare semver strings: returns true if remote > local
 */
function isNewer(local, remote) {
  const parse = (v) => (v || '0').replace(/^v/, '').split('.').map(Number);
  const [lM, lm, lp] = parse(local);
  const [rM, rm, rp] = parse(remote);
  if (rM !== lM) return rM > lM;
  if (rm !== lm) return rm > lm;
  return rp > lp;
}

export default function AppUpdater() {
  const [currentVersion, setCurrentVersion] = useState('');
  const [state, setState] = useState('idle'); // idle | checking | available | downloading | ready | latest | error
  const [latestVersion, setLatestVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [apkUrl, setApkUrl] = useState('');
  const [showFloatingNotification, setShowFloatingNotification] = useState(false);

  useEffect(() => {
    // Get current version
    if (isElectron) {
      window.electronAPI.getVersion().then(setCurrentVersion);
    } else {
      // For Android/web, version is baked in at build time
      setCurrentVersion(import.meta.env.VITE_APP_VERSION || '1.0.0');
    }

    // Listen to Electron updater events
    if (isElectron) {
      window.electronAPI.onUpdateStatus((data) => {
        switch (data.status) {
          case 'checking':    setState('checking'); break;
          case 'available':   setState('available'); setLatestVersion(data.version); break;
          case 'latest':      setState('latest'); break;
          case 'downloading': setState('downloading'); setDownloadPercent(data.percent || 0); break;
          case 'ready':       setState('ready'); setLatestVersion(data.version); break;
          case 'error':       setState('error'); setErrorMsg(data.message); break;
        }
      });
      return () => window.electronAPI.removeUpdateListener();
    }
  }, []);

  // ── Check for update ────────────────────────────────────────────────────
  const checkUpdate = async () => {
    setErrorMsg('');
    setState('checking');

    if (isElectron) {
      // Delegated to main process via IPC
      window.electronAPI.checkForUpdate();
      return;
    }

    // Android / web: check Supabase for latest version
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('version, apk_url, description')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw new Error(`Gagal mengambil data versi: ${error.message}`);
      }

      if (!data || !data.version) {
        throw new Error('Tidak ada versi terbaru di database');
      }

      const remoteVer = data.version;

      if (isNewer(currentVersion, remoteVer)) {
        setLatestVersion(remoteVer);
        setState('available');
        setShowFloatingNotification(true); // Show floating notification

        // Set APK download URL from Supabase
        if (isAndroid && data.apk_url) {
          setApkUrl(data.apk_url);
        }
      } else {
        setState('latest');
      }
    } catch (err) {
      setState('error');
      setErrorMsg(err.message || 'Gagal memeriksa update');
      console.error('Update check error:', err);
    }
  };

  // ── Download & install ──────────────────────────────────────────────────
  const downloadAndInstall = async () => {
    if (isElectron) {
      setState('downloading');
      window.electronAPI.downloadUpdate();
      return;
    }

    if (isAndroid && apkUrl) {
      // Open APK download URL in browser — Android will prompt to install
      window.open(apkUrl, '_system');
    }
  };

  const installNow = () => {
    if (isElectron) window.electronAPI.installUpdate();
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const statusColor = {
    idle:        'text-slate-400',
    checking:    'text-blue-400',
    available:   'text-yellow-400',
    downloading: 'text-blue-400',
    ready:       'text-green-400',
    latest:      'text-green-400',
    error:       'text-red-400',
  }[state] || 'text-slate-400';

  const statusText = {
    idle:        'Belum dicek',
    checking:    'Memeriksa update...',
    available:   `Tersedia versi ${latestVersion}`,
    downloading: `Mengunduh... ${downloadPercent}%`,
    ready:       `Siap install versi ${latestVersion}`,
    latest:      'Sudah versi terbaru',
    error:       `Error: ${errorMsg}`,
  }[state] || '';

  return (
    <>
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-white font-semibold mb-4">Update Aplikasi</h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-400 text-sm">Versi saat ini</p>
            <p className="text-white font-mono font-medium">{currentVersion || '-'}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Status</p>
            <p className={`text-sm font-medium ${statusColor}`}>{statusText || '-'}</p>
          </div>
        </div>

        {/* Progress bar saat downloading */}
        {state === 'downloading' && (
          <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadPercent}%` }}
            />
          </div>
        )}

        <div className="flex gap-3">
          {/* Check button */}
          {(state === 'idle' || state === 'latest' || state === 'error') && (
            <button
              onClick={checkUpdate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Cek Update
            </button>
          )}

          {/* Download button */}
          {state === 'available' && (
            <button
              onClick={downloadAndInstall}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              {isAndroid ? 'Unduh & Install APK' : 'Unduh Update'}
            </button>
          )}

          {/* Install / restart button (Electron only) */}
          {state === 'ready' && isElectron && (
            <button
              onClick={installNow}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Restart & Install
            </button>
          )}

          {/* Spinner saat checking/downloading */}
          {(state === 'checking' || state === 'downloading') && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              {state === 'checking' ? 'Memeriksa...' : `${downloadPercent}%`}
            </div>
          )}
        </div>

        {!isElectron && !isAndroid && (
          <p className="text-slate-500 text-xs mt-3">
            Update otomatis tersedia di versi Windows dan Android.
          </p>
        )}
      </div>

      {/* Floating update notification (bottom left) */}
      {showFloatingNotification && state === 'available' && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm animate-in slide-in-from-left-2 duration-300">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg border border-blue-500/20 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">⬆️</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Update Tersedia!</h4>
                  <p className="text-blue-100 text-xs">Versi {latestVersion} siap diunduh</p>
                </div>
              </div>
              <button
                onClick={() => setShowFloatingNotification(false)}
                className="text-blue-200 hover:text-white text-lg leading-none ml-2"
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={downloadAndInstall}
                className="flex-1 bg-white text-blue-600 px-3 py-2 rounded-md text-xs font-medium hover:bg-blue-50 transition-colors"
              >
                {isAndroid ? 'Unduh APK' : 'Update Sekarang'}
              </button>
              <button
                onClick={() => setShowFloatingNotification(false)}
                className="px-3 py-2 text-blue-200 text-xs hover:text-white transition-colors"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
