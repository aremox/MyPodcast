import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, shell } from 'electron';
import { UsbScanner } from './usb-scanner';
import { Syncer } from './syncer';
import * as path from 'path';
import * as fs from 'fs';

// --- Configuration & Constants ---
const APP_NAME = "MyPodcastSync";
const LOG_FILE = path.join(process.cwd(), 'agent.log');
const ICON_PATH = path.join(process.cwd(), 'apps/desktop-sync/src/assets/icon.ico');
const CONFIG_FILE = path.join(process.cwd(), 'config.json');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isSyncing = false;
let syncTimer: NodeJS.Timeout | null = null;
let currentInterval = 60000;

// --- Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// --- Logger ---
function log(message: string, level: 'INFO' | 'ERROR' | 'SYNC' = 'INFO') {
  const entry = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  console.log(entry.trim());
  try {
    fs.appendFileSync(LOG_FILE, entry);
  } catch (err) {
    // Ignore writing errors
  }
  // Send live logs to Renderer
  if (mainWindow && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('log-added', entry.trim());
  }
}

function notify(title: string, message: string) {
  new Notification({
    title,
    body: message,
    icon: ICON_PATH
  }).show();
}

// --- Local Config Persistance ---
function getLocalConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveLocalConfig(config: any) {
  const current = getLocalConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...config }, null, 2));
}

// --- IPC Interface Handlers ---
ipcMain.handle('get-config', async () => {
  const local = getLocalConfig();
  const autostart = app.getLoginItemSettings().openAtLogin;
  return {
    isPaired: !!local.jwtToken,
    usbSerial: local.targetUsbSerial || null,
    folder: local.targetFolder || 'Podcasts',
    syncInterval: local.syncInterval || 60,
    autostart
  };
});

ipcMain.handle('pair-account', async (_, code: string) => {
  log(`[Pairing] Intentando vincular con código: ${code}...`);
  try {
    const response = await fetch('https://podcast.aremox.com/api/library/pair/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);

    const data = await response.json();
    const token = data.accessToken || data.token;

    if (token) {
      saveLocalConfig({ jwtToken: token });
      log('[Pairing] Token JWT recibido y guardado. Vinculación EXITOSA.');
      notify('MyPodcast Sync', '¡Dispositivo vinculado con éxito!');
      sendConfigUpdate();
      setTimeout(fetchConfigAndSync, 1000);
      return true;
    } else {
      log('[Pairing] Código inválido o expirado', 'ERROR');
      notify('MyPodcast Sync', 'El código de vinculación no es válido.');
      return false;
    }
  } catch (err) {
    log(`[Pairing] Error de conexión: ${err}`, 'ERROR');
    notify('MyPodcast Sync', 'Error de red al intentar vincular.');
    return false;
  }
});

ipcMain.on('trigger-sync', () => {
  log('Sincronización manual iniciada por el usuario.');
  fetchConfigAndSync();
});

ipcMain.on('toggle-autostart', () => {
  const current = app.getLoginItemSettings().openAtLogin;
  app.setLoginItemSettings({
    openAtLogin: !current,
    path: process.execPath,
    args: []
  });
  log(`Arranque automático cambiado: ${!current ? 'ACTIVADO' : 'DESACTIVADO'}`);
  notify('MyPodcast Sync', !current ? 'Inicio automático con Windows activado' : 'Inicio automático con Windows desactivado');
  sendConfigUpdate();
});

ipcMain.on('open-logs-folder', () => {
  if (fs.existsSync(LOG_FILE)) {
    shell.showItemInFolder(LOG_FILE);
  } else {
    log('El archivo de logs aún no existe.', 'ERROR');
  }
});

// --- UI Sync Broadcasting ---
function sendSyncStatus(isSyncing: boolean, message = '', percent = 0) {
  if (mainWindow && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('sync-status', { isSyncing, message, percent });
  }
}

function sendConfigUpdate() {
  if (mainWindow && !mainWindow.webContents.isDestroyed()) {
    const local = getLocalConfig();
    const autostart = app.getLoginItemSettings().openAtLogin;
    mainWindow.webContents.send('config-updated', {
      isPaired: !!local.jwtToken,
      usbSerial: local.targetUsbSerial || null,
      folder: local.targetFolder || 'Podcasts',
      syncInterval: local.syncInterval || 60,
      autostart
    });
  }
}

// --- Sync Coordination Core ---
async function fetchConfigAndSync() {
  const localConfig = getLocalConfig();
  if (!localConfig.jwtToken) {
    log('Dispositivo no emparejado. Sincronización cancelada.');
    sendSyncStatus(false);
    return;
  }

  if (isSyncing) return;
  isSyncing = true;
  sendSyncStatus(true, 'Obteniendo lista del servidor...');

  try {
    const response = await fetch('https://podcast.aremox.com/api/library/sync-config', {
      headers: { 'Authorization': `Bearer ${localConfig.jwtToken}` }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const remoteConfig = await response.json();
    const config = remoteConfig.data || remoteConfig;

    log(`Configuración: USB=${config.targetUsbSerial}, Carpeta=${config.targetFolder}, Intervalo=${config.syncInterval}s`);
    
    saveLocalConfig({
      targetUsbSerial: config.targetUsbSerial,
      targetFolder: config.targetFolder,
      syncInterval: config.syncInterval
    });
    sendConfigUpdate();

    if (config.targetUsbSerial) {
      const drives = await UsbScanner.getRemovableDrives();
      const drive = drives.find(d => d.serialNumber === config.targetUsbSerial);
      
      if (drive) {
        log(`USB emparejado detectado en unidad ${drive.deviceId}. Iniciando descarga...`);
        
        await Syncer.startSync(drive.deviceId, config.targetFolder, localConfig.jwtToken, (msg) => {
          log(msg, 'SYNC');
          
          let pct = 0;
          const match = msg.match(/Downloading\s*\((\d+)\/(\d+)\)/i);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            pct = (current / total) * 100;
          } else if (msg.toLowerCase().includes('complete')) {
            pct = 100;
          }
          sendSyncStatus(true, msg, pct);
        });

        notify('MyPodcast Sync', '¡Sincronización de podcasts completada!');
      } else {
        log(`El USB configurado (${config.targetUsbSerial}) no se encuentra conectado.`, 'ERROR');
        sendSyncStatus(false, 'USB no conectado');
      }
    } else {
      log('No hay ningún número de serie USB configurado en tu cuenta.');
      sendSyncStatus(false, 'USB no configurado');
    }
    updateLoopInterval(config.syncInterval);
  } catch (err) {
    log(`Excepción en la sincronización: ${err}`, 'ERROR');
    sendSyncStatus(false, 'Error de sincronización');
  } finally {
    isSyncing = false;
    sendSyncStatus(false);
  }
}

// --- Sync Loop management ---
function updateLoopInterval(seconds: number) {
  const newInterval = (seconds || 60) * 1000;
  if (newInterval !== currentInterval) {
    log(`Cambiando intervalo de sincronización automática a ${seconds} segundos`);
    currentInterval = newInterval;
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(fetchConfigAndSync, currentInterval);
  }
}

async function startSyncLoop() {
  await fetchConfigAndSync();
  if (!syncTimer) syncTimer = setInterval(fetchConfigAndSync, currentInterval);
}

// --- Window and Tray Creation ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 550,
    height: 650,
    resizable: false,
    maximizable: false,
    title: 'MyPodcast Sync Agent',
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'assets/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'assets/index.html'));

  mainWindow.on('close', (e) => {
    // If not explicitly quitting the app via Tray menu, hide the window to run in background
    if (!(app as any).isQuiting) {
      e.preventDefault();
      mainWindow?.hide();
      log('Aplicación minimizada a la bandeja del sistema.');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupTray() {
  tray = new Tray(ICON_PATH);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'MyPodcast Desktop Agent', enabled: false },
    { type: 'separator' },
    { label: 'Mostrar Panel de Control', click: () => { mainWindow?.show(); } },
    { label: 'Sincronizar Ahora', click: () => { fetchConfigAndSync(); } },
    { type: 'separator' },
    { label: 'Salir', click: () => {
        (app as any).isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('MyPodcast USB Auto-Sync');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

// --- App Lifecycle Event Registers ---
app.whenReady().then(() => {
  log('Arrancando agente de sincronización en segundo plano con Electron...');
  createWindow();
  setupTray();
  startSyncLoop();

  // Watch removable USBs changes in real-time
  UsbScanner.startMonitoring(10000, (drive) => {
    log(`Nueva unidad extraíble detectada: ${drive.volumeName} (${drive.deviceId})`);
    fetchConfigAndSync();
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
