'use strict';

const { app, BrowserWindow, ipcMain, utilityProcess } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
let serverProcess;

// Load .env — pass all vars to the server utility process
const envPath = isDev
  ? path.join(__dirname, '../.env')
  : path.join(app.getAppPath(), '.env');
dotenv.config({ path: envPath });

// ── Auto-updater config ────────────────────────────────────────────────────
autoUpdater.autoDownload = false;          // manual download (user confirms)
autoUpdater.autoInstallOnAppQuit = false;  // we control install timing

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ status: 'available', version: info.version, releaseNotes: info.releaseNotes });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ status: 'latest' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({ status: 'downloading', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ status: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus({ status: 'error', message: err.message });
  });
}

function sendUpdateStatus(data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', data);
  }
}

// ── IPC handlers ──────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('check-for-update', async () => {
  if (isDev) {
    sendUpdateStatus({ status: 'error', message: 'Update check disabled in dev mode' });
    return;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    sendUpdateStatus({ status: 'error', message: err.message });
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    sendUpdateStatus({ status: 'error', message: err.message });
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// ── Express server ────────────────────────────────────────────────────────
function startExpressServer() {
  const serverPath = app.isPackaged
    ? path.join(app.getAppPath(), 'src', 'server', 'index.js')
    : path.join(__dirname, '../src/server/index.js');

  serverProcess = utilityProcess.fork(serverPath, [], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit',
  });

  serverProcess.on('exit', (code) => {
    console.log(`[server] exited with code ${code}`);
  });
}

function waitForServer(maxAttempts = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get('http://localhost:5000', () => resolve());
      req.on('error', () => {
        if (attempts < maxAttempts) setTimeout(check, 500);
        else reject(new Error('Express server failed to start'));
      });
      req.end();
    };
    setTimeout(check, 1000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
  });

  const url = isDev ? 'http://localhost:3000/mmn/' : 'http://localhost:5000';
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for update silently on startup (after 3s delay)
    if (!isDev) {
      setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  setupAutoUpdater();
  if (!isDev) {
    startExpressServer();
    await waitForServer().catch((err) => console.error('[electron]', err.message));
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (serverProcess) serverProcess.kill();
});
