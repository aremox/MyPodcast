import SysTray from 'systray2';
import { UsbScanner } from './usb-scanner';
import { Syncer } from './syncer';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
const notifier = require('node-notifier');

// --- Configuration & Constants ---
const APP_NAME = "MyPodcastSync";
const LOG_FILE = path.join(process.cwd(), 'agent.log');
const ICON_PATH = path.join(process.cwd(), 'apps/desktop-sync/src/assets/icon.ico');
const CONFIG_FILE = path.join(process.cwd(), 'config.json');

let isSyncing = false;
let autoStart = false;

// --- Logger ---
function log(message: string, level: 'INFO' | 'ERROR' | 'SYNC' = 'INFO') {
  const entry = `[${newInterval().toISOString()}] [${level}] ${message}\n`;
  console.log(entry.trim());
  fs.appendFileSync(LOG_FILE, entry);
}

// Fixed date helper for logging (shadowing new Date for internal logs if needed)
function newInterval() { return new Date(); }

// --- Persistence ---
function getLocalConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return {};
}

function saveLocalConfig(config: any) {
  const current = getLocalConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...config }, null, 2));
}

// --- Autostart Management ---
function isAutostartEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}"`;
    exec(cmd, (err, stdout) => {
      const exists = !err;
      resolve(exists);
    });
  });
}

function toggleAutostart() {
  isAutostartEnabled().then(enabled => {
    const nodePath = process.execPath;
    const scriptPath = process.argv[1];
    const command = `"${nodePath}" "${scriptPath}"`;
    
    let cmd = '';
    if (enabled) {
      cmd = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}" /f`;
    } else {
      cmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}" /t REG_SZ /d "${command.replace(/"/g, '\\"')}" /f`;
    }

    log(`Toggling autostart. Command: ${cmd}`);
    exec(cmd, (err) => {
      if (err) {
        log(`Failed to toggle autostart: ${err}`, 'ERROR');
      } else {
        log(enabled ? 'Autostart disabled' : 'Autostart enabled');
        notifier.notify({
          title: 'MyPodcast Sync',
          message: enabled ? 'Inicio automático desactivado' : 'Inicio automático activado',
          icon: ICON_PATH
        });
        refreshMenu();
      }
    });
  });
}

// --- Tray Menu ---
const getMenuItems = () => [
  { title: "MyPodcast Sync v1.1", tooltip: "Estado del Agente", enabled: false },
  { title: isSyncing ? "🟡 Sincronizando..." : "🟢 Listo", tooltip: "", enabled: false },
  { title: "---", tooltip: "", enabled: false },
  { title: "Sincronizar ahora", tooltip: "Forzar sincronización", enabled: true },
  { title: "Ver Logs", tooltip: "Abrir archivo de log", enabled: true },
  { title: autoStart ? "✓ Arrancar con Windows" : "Arrancar con Windows", tooltip: "Alternar inicio automático", enabled: true },
  { title: "---", tooltip: "", enabled: false },
  { title: "Configuración (Web)", tooltip: "Abrir panel de control", enabled: true },
  { title: "Vincular con mi cuenta", tooltip: "Introducir código", enabled: true },
  { title: "---", tooltip: "", enabled: false },
  { title: "Reiniciar Agente", tooltip: "Cerrar y volver a abrir", enabled: true },
  { title: "Salir", tooltip: "Cerrar aplicación", enabled: true }
];

let systray: SysTray;

async function refreshMenu() {
  autoStart = await isAutostartEnabled();
  if (systray) {
    systray.sendAction({
      type: 'update-menu',
      menu: { 
        icon: ICON_PATH, 
        title: "MyPodcast Sync", 
        tooltip: "MyPodcast USB Auto-Sync", 
        items: getMenuItems() 
      },
    });
  }
}

async function startTray() {
  autoStart = await isAutostartEnabled();
  systray = new SysTray({
    menu: { 
      icon: ICON_PATH, 
      title: "MyPodcast Sync", 
      tooltip: "MyPodcast USB Auto-Sync", 
      items: getMenuItems() 
    },
    debug: false,
    copyDir: true,
  });

  systray.onClick(action => {
    const title = action.item.title;
    log(`Tray click: ${title}`);

    if (title.includes("Configuración")) {
      exec('start https://podcast.aremox.com/desktop-sync');
    } else if (title.includes("Vincular")) {
      promptForPairingCode();
    } else if (title.includes("Sincronizar ahora")) {
      log('Manual sync requested');
      fetchConfigAndSync();
    } else if (title === "Ver Logs") {
      exec(`notepad.exe "${LOG_FILE}"`);
    } else if (title.includes("Arrancar con Windows")) {
      toggleAutostart();
    } else if (title === "Reiniciar Agente") {
      restartAgent();
    } else if (title === "Salir") {
      systray.kill();
      process.exit(0);
    }
  });
}

function restartAgent() {
  log('Restarting agent via batch...');
  const batchPath = path.join(process.cwd(), 'restart.bat');
  const batchContent = `@echo off\ntimeout /t 2 /nobreak > nul\nstart npx nx serve desktop-sync\ndel "%~f0"`;
  fs.writeFileSync(batchPath, batchContent);
  spawn('cmd.exe', ['/c', batchPath], { detached: true, stdio: 'ignore' }).unref();
  systray.kill();
  process.exit(0);
}

// --- Pairing System ---
function promptForPairingCode() {
  const vbsPath = path.join(process.cwd(), 'input.vbs');
  fs.writeFileSync(vbsPath, 'code = InputBox("Introduce el código de vinculación de la web:", "Vincular MyPodcast")\nWScript.Echo code');
  
  exec(`cscript //nologo "${vbsPath}"`, (err, stdout) => {
    const code = stdout.trim();
    fs.unlinkSync(vbsPath);
    if (code && code.length === 6) {
      log(`Vincular con código: ${code}`);
      validateAndSaveToken(code);
    }
  });
}

async function validateAndSaveToken(code: string) {
  try {
    const response = await fetch('https://podcast.aremox.com/api/library/pair/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    if (data.token) {
      saveLocalConfig({ jwtToken: data.token });
      log('Pairing SUCCESSFUL!');
      notifier.notify({ title: 'MyPodcast Sync', message: '¡Cuenta vinculada correctamente!', icon: ICON_PATH });
      fetchConfigAndSync();
    } else {
      log('Pairing failed: Invalid code', 'ERROR');
      notifier.notify({ title: 'MyPodcast Sync', message: 'Código inválido o expirado.', icon: ICON_PATH });
    }
  } catch (err) {
    log(`Connection error during pairing: ${err}`, 'ERROR');
  }
}

// --- Sync Logic ---
async function fetchConfigAndSync() {
  const localConfig = getLocalConfig();
  if (!localConfig.jwtToken) {
    log('Not paired. Skipping sync.');
    return;
  }

  try {
    const response = await fetch('https://podcast.aremox.com/api/library/sync-config', {
      headers: { 'Authorization': `Bearer ${localConfig.jwtToken}` }
    });
    const remoteConfig = await response.json();

    log(`Config Received: USB=${remoteConfig.targetUsbSerial}, Folder=${remoteConfig.targetFolder}, Interval=${remoteConfig.syncInterval}s`);

    if (remoteConfig.targetUsbSerial) {
      const drives = await UsbScanner.getRemovableDrives();
      const drive = drives.find(d => d.serialNumber === remoteConfig.targetUsbSerial);
      
      if (drive) {
        if (isSyncing) {
          log('Already syncing, skipping request.');
          return;
        }
        isSyncing = true;
        refreshMenu();
        
        log(`Starting sync to ${drive.deviceId} (${remoteConfig.targetFolder})`, 'SYNC');
        
        const progressCb = (msg: string) => {
          log(msg, 'SYNC');
        };

        try {
          await Syncer.startSync(drive.deviceId, remoteConfig.targetFolder, localConfig.jwtToken, progressCb);
          notifier.notify({ title: 'MyPodcast Sync', message: 'Sincronización completada.', icon: ICON_PATH });
        } catch (err) {
          log(`Sync failed: ${err}`, 'ERROR');
          notifier.notify({ title: 'MyPodcast Sync', message: `Fallo: ${err}`, icon: ICON_PATH });
        } finally {
          isSyncing = false;
          refreshMenu();
        }
      } else {
        log(`Configured USB (${remoteConfig.targetUsbSerial}) not found.`);
      }
    }
  } catch (err) {
    log(`Error fetching config: ${err}`, 'ERROR');
  }
}

// --- Lifecycle ---
let syncTimer: NodeJS.Timeout;
let currentInterval = 60000;

async function startSyncLoop() {
  await fetchConfigAndSync();
  
  const localConfig = getLocalConfig();
  if (localConfig.jwtToken) {
    try {
      const response = await fetch('https://podcast.aremox.com/api/library/sync-config', {
        headers: { 'Authorization': `Bearer ${localConfig.jwtToken}` }
      });
      const config = await response.json();
      const newInterval = (config.syncInterval || 60) * 1000;
      
      if (newInterval !== currentInterval) {
        log(`Updating sync interval to ${config.syncInterval} seconds`);
        currentInterval = newInterval;
        if (syncTimer) clearInterval(syncTimer);
        syncTimer = setInterval(fetchConfigAndSync, currentInterval);
      }
    } catch (err) {
      if (!syncTimer) syncTimer = setInterval(fetchConfigAndSync, currentInterval);
    }
  } else {
    if (!syncTimer) syncTimer = setInterval(fetchConfigAndSync, currentInterval);
  }
}

startTray();
startSyncLoop();

UsbScanner.startMonitoring(10000, () => {
  log('USB Change detected');
  fetchConfigAndSync();
});
