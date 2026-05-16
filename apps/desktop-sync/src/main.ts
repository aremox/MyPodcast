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

// Simple instance check (using a lock file)
const LOCK_FILE = path.join(process.cwd(), 'agent.lock');
if (fs.existsSync(LOCK_FILE)) {
  const pid = fs.readFileSync(LOCK_FILE, 'utf8');
  try {
    process.kill(parseInt(pid), 0);
    console.error('Another agent instance is already running. Exiting.');
    process.exit(1);
  } catch (e) {
    // Process not running, we can take over
  }
}
fs.writeFileSync(LOCK_FILE, process.pid.toString());
process.on('exit', () => fs.existsSync(LOCK_FILE) && fs.unlinkSync(LOCK_FILE));
process.on('SIGINT', () => process.exit());

let isSyncing = false;
let autoStart = false;
let systray: SysTray;

// --- Logger ---
function log(message: string, level: 'INFO' | 'ERROR' | 'SYNC' = 'INFO') {
  const entry = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  console.log(entry.trim());
  fs.appendFileSync(LOG_FILE, entry);
}

// --- Persistence ---
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

// --- Autostart Management ---
function isAutostartEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}"`;
    exec(cmd, (err) => resolve(!err));
  });
}

function toggleAutostart() {
  isAutostartEnabled().then(enabled => {
    const nodePath = process.execPath;
    const scriptPath = process.argv[1];
    const command = `"${nodePath}" "${scriptPath}"`;
    
    const cmd = enabled 
      ? `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}" /f`
      : `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}" /t REG_SZ /d "${command.replace(/"/g, '\\"')}" /f`;

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
function getMenuItems() {
  const localConfig = getLocalConfig();
  const isPaired = !!localConfig.jwtToken;
  
  return [
    { title: `MyPodcast Sync ${isPaired ? '✅' : '❌'}`, tooltip: isPaired ? 'Vinculado' : 'No vinculado', enabled: false },
    { title: isSyncing ? "🟡 Sincronizando..." : "🟢 Listo", tooltip: "", enabled: false },
    { title: "---", tooltip: "", enabled: false },
    { title: "Sincronizar ahora", tooltip: "Forzar sincronización", enabled: true },
    { title: "Ver Logs", tooltip: "Abrir archivo de log", enabled: true },
    { title: autoStart ? "✓ Arrancar con Windows" : "Arrancar con Windows", tooltip: "Alternar inicio automático", enabled: true },
    { title: "---", tooltip: "", enabled: false },
    { title: "Vincular con mi cuenta", tooltip: "Introducir código", enabled: true },
    { title: "---", tooltip: "", enabled: false },
    { title: "Reiniciar Agente", tooltip: "Cerrar y volver a abrir", enabled: true },
    { title: "Salir", tooltip: "Cerrar aplicación", enabled: true }
  ];
}

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

    if (title.includes("Vincular")) {
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
  if (systray) systray.kill();
  process.exit(0);
}

// --- Pairing System ---
function promptForPairingCode() {
  const vbsPath = path.join(process.cwd(), 'input.vbs');
  fs.writeFileSync(vbsPath, 'code = InputBox("Introduce el código de vinculación de la web:", "Vincular MyPodcast")\nWScript.Echo code');
  
  exec(`cscript //nologo "${vbsPath}"`, (err, stdout) => {
    const code = stdout.trim();
    if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath);
    if (code && code.length === 6) {
      log(`Vincular con código: ${code}`);
      validateAndSaveToken(code);
    }
  });
}

async function validateAndSaveToken(code: string) {
  log(`[Pairing] Validating code ${code}...`);
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
      log('[Pairing] Token received and saved. SUCCESS!');
      notifier.notify({ title: 'MyPodcast Sync', message: '¡Cuenta vinculada correctamente!', icon: ICON_PATH });
      refreshMenu();
      setTimeout(fetchConfigAndSync, 1000);
    } else {
      log('[Pairing] Invalid code or expired', 'ERROR');
      notifier.notify({ title: 'MyPodcast Sync', message: 'Código inválido o expirado.', icon: ICON_PATH });
    }
  } catch (err) {
    log(`[Pairing] Connection error: ${err}`, 'ERROR');
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
    const config = remoteConfig.data || remoteConfig;

    log(`Config Received: USB=${config.targetUsbSerial}, Folder=${config.targetFolder}, Interval=${config.syncInterval}s`);

    if (config.targetUsbSerial) {
      const drives = await UsbScanner.getRemovableDrives();
      const drive = drives.find(d => d.serialNumber === config.targetUsbSerial);
      
      if (drive) {
        if (isSyncing) return;
        isSyncing = true;
        refreshMenu();
        
        try {
          await Syncer.startSync(drive.deviceId, config.targetFolder, localConfig.jwtToken, (msg) => log(msg, 'SYNC'));
          notifier.notify({ title: 'MyPodcast Sync', message: 'Sincronización completada.', icon: ICON_PATH });
        } catch (err) {
          log(`Sync failed: ${err}`, 'ERROR');
        } finally {
          isSyncing = false;
          refreshMenu();
        }
      } else {
        log(`Configured USB (${config.targetUsbSerial}) not found.`);
      }
    }
    updateLoopInterval(config.syncInterval);
  } catch (err) {
    log(`Error fetching config: ${err}`, 'ERROR');
  }
}

// --- Lifecycle ---
let syncTimer: NodeJS.Timeout;
let currentInterval = 60000;

function updateLoopInterval(seconds: number) {
  const newInterval = (seconds || 60) * 1000;
  if (newInterval !== currentInterval) {
    log(`Updating sync interval to ${seconds} seconds`);
    currentInterval = newInterval;
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(fetchConfigAndSync, currentInterval);
  }
}

async function startSyncLoop() {
  await fetchConfigAndSync();
  if (!syncTimer) syncTimer = setInterval(fetchConfigAndSync, currentInterval);
}

startTray();
startSyncLoop();

UsbScanner.startMonitoring(10000, () => {
  log('USB Change detected');
  fetchConfigAndSync();
});
