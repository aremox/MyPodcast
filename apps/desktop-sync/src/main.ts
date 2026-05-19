import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, shell } from 'electron';
import { UsbScanner } from './usb-scanner';
import { Syncer } from './syncer';
import * as path from 'path';
import * as fs from 'fs';

// --- Configuration & Constants ---
const APP_NAME = "MyPodcastSync";
const CONFIG_DIR = app.getPath('userData');
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
const LOG_FILE = path.join(CONFIG_DIR, 'agent.log');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const ICON_PATH = path.join(__dirname, 'assets/icon.ico');

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
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    handleDeepLinkArgs(commandLine);
  });
}

function handleDeepLinkArgs(args: string[]) {
  log(`Recibidos argumentos de línea de comandos: ${JSON.stringify(args)}`);
  
  const deepLink = args.find(arg => arg.startsWith('mypodcastsync://'));
  if (deepLink) {
    log(`Deep link detectado: ${deepLink}`);
    try {
      const urlObj = new URL(deepLink);
      const host = urlObj.host; // e.g. "open-folder" or "play"
      const params = urlObj.searchParams;
      
      if (host === 'open-folder') {
        const folderPath = params.get('path');
        if (folderPath) {
          const decoded = decodeURIComponent(folderPath);
          log(`Abriendo carpeta: ${decoded}`);
          shell.openPath(decoded);
        }
      } else if (host === 'play') {
        const filePath = params.get('file');
        if (filePath) {
          const decoded = decodeURIComponent(filePath);
          log(`Reproduciendo archivo: ${decoded}`);
          shell.openPath(decoded);
        }
      }
    } catch (err) {
      log(`Error al procesar deep link: ${err}`, 'ERROR');
    }
  }
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

async function notify(title: string, message: string) {
  const localConfig = getLocalConfig();
  if (localConfig.targetUsbSerial) {
    try {
      const drives = await UsbScanner.getRemovableDrives();
      const isConnected = drives.some(d => d.serialNumber === localConfig.targetUsbSerial);
      if (!isConnected) {
        log(`[Notificación Omitida] "${title}" no se mostró porque el USB (${localConfig.targetUsbSerial}) no está conectado.`, 'INFO');
        return;
      }
    } catch (err) {
      log(`Error al comprobar estado del USB para notificación: ${err}`, 'ERROR');
    }
  } else {
    // Si no hay USB configurado, omitimos las notificaciones que no sean de configuración/emparejamiento
    const isPairingOrSetup = title.toLowerCase().includes('sesión') || 
                             title.toLowerCase().includes('vinc') || 
                             title.toLowerCase().includes('error');
    if (!isPairingOrSetup) {
      log(`[Notificación Omitida] "${title}" no se mostró porque no hay ningún USB configurado.`, 'INFO');
      return;
    }
  }

  const notif = new Notification({
    title,
    body: message,
    icon: ICON_PATH
  });
  notif.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  notif.show();
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

function getServerUrl(): string {
  const local = getLocalConfig();
  return local.serverUrl || 'https://podcast.aremox.com';
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
    serverUrl: local.serverUrl || 'https://podcast.aremox.com',
    downloadSpeedLimit: local.downloadSpeedLimit || 0,
    autostart
  };
});

ipcMain.handle('set-server-url', async (_, url: string) => {
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, ''); // Remove trailing slashes
    saveLocalConfig({ serverUrl: cleanUrl });
    log(`[Config] URL del servidor actualizada a: ${cleanUrl}`);
    sendConfigUpdate();
    return true;
  } catch (err) {
    log(`[Config] Error al guardar la URL del servidor: ${err}`, 'ERROR');
    return false;
  }
});

ipcMain.handle('unpair-account', async () => {
  log('[Pairing] Desvinculando cuenta de este dispositivo...');
  try {
    saveLocalConfig({
      jwtToken: null,
      targetUsbSerial: null,
      targetFolder: null,
      syncInterval: null
    });
    
    // Stop sync loops if running
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    
    log('[Pairing] Dispositivo desvinculado correctamente.');
    notify('MyPodcast Sync', 'Dispositivo desvinculado.');
    sendConfigUpdate();
    return true;
  } catch (err) {
    log(`[Pairing] Error al desvincular dispositivo: ${err}`, 'ERROR');
    return false;
  }
});

ipcMain.handle('pair-account', async (_, code: string) => {
  log(`[Pairing] Intentando vincular con código: ${code}...`);
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/api/library/pair/validate`, {
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
      serverUrl: local.serverUrl || 'https://podcast.aremox.com',
      downloadSpeedLimit: local.downloadSpeedLimit || 0,
      autostart
    });
  }
}

ipcMain.handle('set-speed-limit', async (_, limit: number) => {
  try {
    saveLocalConfig({ downloadSpeedLimit: limit });
    log(`[Config] Límite de velocidad de descarga actualizado a: ${limit > 0 ? limit + ' KB/s' : 'Sin límite'}`);
    sendConfigUpdate();
    return true;
  } catch (err) {
    log(`[Config] Error al guardar el límite de velocidad: ${err}`, 'ERROR');
    return false;
  }
});

async function reportUsbStorageSpace(driveSerialNumber: string, targetFolder: string, jwtToken: string) {
  try {
    const drives = await UsbScanner.getRemovableDrives();
    const drive = drives.find(d => d.serialNumber === driveSerialNumber);
    if (drive) {
      const podcastsDir = path.join(drive.deviceId, targetFolder);
      const podcastsSpace = Syncer.getFolderSize(podcastsDir);
      const totalSpace = drive.size;
      const freeSpace = drive.freeSpace;
      const otherSpace = Math.max(0, totalSpace - freeSpace - podcastsSpace);
      const format = drive.fileSystem;

      log(`[Storage] Reportando estadísticas USB: Total=${(totalSpace/1e9).toFixed(1)}GB, Libre=${(freeSpace/1e9).toFixed(1)}GB, Podcasts=${(podcastsSpace/1e9).toFixed(2)}GB`);
      
      const serverUrl = getServerUrl();
      await fetch(`${serverUrl}/api/library/sync-config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          usbTotalSpace: totalSpace,
          usbFreeSpace: freeSpace,
          usbPodcastsSpace: podcastsSpace,
          usbOtherSpace: otherSpace,
          usbFormat: format
        })
      });
    }
  } catch (err) {
    log(`[Storage] Error al reportar estadísticas USB: ${err}`, 'ERROR');
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
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/api/library/sync-config`, {
      headers: { 'Authorization': `Bearer ${localConfig.jwtToken}` }
    });
    
    if (response.status === 401) {
      log('Sesión expirada o no autorizada (HTTP 401). Desvinculando automáticamente...', 'ERROR');
      notify('Sesión Expirada', 'La vinculación con el servidor ha caducado. Por favor, vuelve a vincular el dispositivo.');
      saveLocalConfig({
        jwtToken: null,
        targetUsbSerial: null,
        targetFolder: null,
        syncInterval: null
      });
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
      sendConfigUpdate();
      isSyncing = false;
      sendSyncStatus(false);
      return;
    }

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
        
        // Report initial USB space
        await reportUsbStorageSpace(config.targetUsbSerial, config.targetFolder, localConfig.jwtToken);

        const serverUrl = getServerUrl();
        const speedLimit = Number(localConfig.downloadSpeedLimit || 0);
        const stats = await Syncer.startSync(drive.deviceId, config.targetFolder, localConfig.jwtToken, (msg) => {
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
        }, serverUrl, speedLimit);

        // Rich native notification detailing downloaded and deleted files
        if (stats.downloaded > 0 || stats.deleted > 0) {
          let summaryMsg = `Descargados: ${stats.downloaded} nuevo(s)`;
          if (stats.deleted > 0) {
            summaryMsg += `, Eliminados: ${stats.deleted} antiguo(s)`;
          }
          summaryMsg += `. Total en cola: ${stats.total}.`;
          
          if (stats.failed > 0) {
            summaryMsg += ` (${stats.failed} fallidos)`;
            notify('Sincronización con Advertencias', summaryMsg);
          } else {
            notify('Sincronización Completada', summaryMsg);
          }
        } else {
          if (stats.failed > 0) {
            notify('Sincronización Incompleta', `No se pudo descargar ningún podcast nuevo. Fallos: ${stats.failed}.`);
          } else {
            notify('Podcasts al Día', `Todos tus podcasts están actualizados (${stats.total} en cola).`);
          }
        }

        // Report final USB space (after downloads)
        await reportUsbStorageSpace(config.targetUsbSerial, config.targetFolder, localConfig.jwtToken);
      } else {
        log(`El USB configurado (${config.targetUsbSerial}) no se encuentra conectado.`, 'ERROR');
        sendSyncStatus(false, 'USB no conectado');
        notify('USB No Detectado', `El dispositivo USB configurado (${config.targetUsbSerial}) no está conectado.`);
      }
    } else {
      log('No hay ningún número de serie USB configurado en tu cuenta.');
      sendSyncStatus(false, 'USB no configurado');
    }
    updateLoopInterval(config.syncInterval);
  } catch (err: any) {
    log(`Excepción en la sincronización: ${err}`, 'ERROR');
    sendSyncStatus(false, 'Error de sincronización');
    notify('Sincronización Fallida', `Error inesperado: ${err.message || err}`);
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
    width: 620,
    height: 780,
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
  
  // Register custom protocol for deep linking
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('mypodcastsync', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('mypodcastsync');
  }

  // Handle deep link on cold start
  handleDeepLinkArgs(process.argv);

  createWindow();
  setupTray();
  startSyncLoop();

  // Watch removable USBs changes in real-time
  UsbScanner.startMonitoring(10000, (drive) => {
    log(`Nueva unidad extraíble detectada: ${drive.volumeName} (${drive.deviceId}) - SN: ${drive.serialNumber}`);
    const local = getLocalConfig();
    if (local.targetUsbSerial && local.targetUsbSerial === drive.serialNumber) {
      notify('USB Detectado', `Se ha detectado el dispositivo USB '${drive.volumeName || 'Podcast USB'}'. Iniciando sincronización automática...`);
    }
    fetchConfigAndSync();
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
