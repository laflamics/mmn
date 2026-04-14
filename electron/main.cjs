'use strict';

const { app, BrowserWindow, utilityProcess } = require('electron');
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
    setTimeout(check, 1000); // initial delay before first check
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  const url = isDev ? 'http://localhost:3000/mmn/' : 'http://localhost:5000';
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
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
