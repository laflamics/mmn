'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Update
  checkForUpdate:   ()         => ipcRenderer.invoke('check-for-update'),
  downloadUpdate:   ()         => ipcRenderer.invoke('download-update'),
  installUpdate:    ()         => ipcRenderer.invoke('install-update'),
  onUpdateStatus:   (callback) => ipcRenderer.on('update-status', (_, data) => callback(data)),
  removeUpdateListener: ()     => ipcRenderer.removeAllListeners('update-status'),
  // App info
  getVersion:       ()         => ipcRenderer.invoke('get-version'),
  platform:         process.platform,
});
