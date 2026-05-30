const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  pairAccount: (code) => ipcRenderer.invoke('pair-account', code),
  unpairAccount: () => ipcRenderer.invoke('unpair-account'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  setSpeedLimit: (limit) => ipcRenderer.invoke('set-speed-limit', limit),
  triggerSync: () => ipcRenderer.send('trigger-sync'),
  toggleAutostart: () => ipcRenderer.send('toggle-autostart'),
  openLogsFolder: () => ipcRenderer.send('open-logs-folder'),
  getUsbDrives: () => ipcRenderer.invoke('get-usb-drives'),
  configureUsb: (serial) => ipcRenderer.invoke('configure-usb', serial),
  onLog: (callback) => ipcRenderer.on('log-added', (_, log) => callback(log)),
  onSyncStatus: (callback) => ipcRenderer.on('sync-status', (_, status) => callback(status)),
  onConfigUpdated: (callback) => ipcRenderer.on('config-updated', (_, config) => callback(config))
});
