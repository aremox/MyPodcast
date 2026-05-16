import SysTray from 'systray2';
import { UsbScanner } from './usb-scanner';
import { Syncer } from './syncer';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import notifier from 'node-notifier';

const ICON_PATH = path.join(__dirname, 'assets', 'icon.ico');
const LOG_FILE = path.join(process.cwd(), 'agent.log');
const APP_NAME = "MyPodcastSync";

// --- Logger System ---
function log(message: string, level: 'INFO' | 'ERROR' | 'SYNC' = 'INFO') {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [${level}] ${message}`;
  console.log(formatted);
  try {
    fs.appendFileSync(LOG_FILE, formatted + '\n');
  } catch (err) {
    console.error('Failed to write to log file', err);
  }
}

// --- Windows Autostart System ---
function isAutostartEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}"`;
    exec(cmd, (err, stdout) => {
      // If there's an error, the key likely doesn't exist
      const exists = !err;
      log(`Autostart check: exists=${exists}, stdout=${stdout.trim()}`);
      resolve(exists);
    });
  });
}

async function toggleAutostart() {
  const enabled = await isAutostartEnabled();
  
  // Use powershell to handle the registry add more reliably with quotes
  const fullCommand = process.argv.join(' ');
  const command = enabled 
    ? `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}" /f`
    : `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${APP_NAME}" /t REG_SZ /d "\\"${process.argv[0]}\\" \\"${process.argv.slice(1).join('\\" \\"')}\\"" /f`;
  
  log(`Toggling autostart. Command: ${command}`);

  exec(command, (err) => {
    if (err) {
      log(`Failed to toggle autostart: ${err.message}`, 'ERROR');
      notifier.notify({ title: 'MyPodcast Sync', message: 'Error al configurar arranque automático.', icon: ICON_PATH });
    } else {
      const newState = !enabled;
      log(`Autostart ${newState ? 'enabled' : 'disabled'}`);
      notifier.notify({
        title: 'MyPodcast Sync',
        message: `Arranque automático ${newState ? 'activado' : 'desactivado'}`,
        icon: ICON_PATH
      });
      // Force immediate menu update
      autoStart = newState;
      refreshMenu();
    }
  });
}

// --- Menu Configuration ---
let isSyncing = false;
let autoStart = false;

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
        
        // Setup progress callback for Syncer
        const progressCb = (msg: string) => {
          log(msg, 'SYNC');
          // Optional: Update tooltip with current progress
        };

        try {
          await Syncer.startSync(drive.deviceId, remoteConfig.targetFolder, localConfig.jwtToken, progressCb);
          notifier.notify({ 
            title: 'MyPodcast Sync', 
            message: 'Sincronización completada con éxito.', 
            icon: ICON_PATH 
          });
        } catch (err) {
          log(`Sync failed: ${err}`, 'ERROR');
          notifier.notify({ 
            title: 'MyPodcast Sync', 
            message: `Fallo en la sincronización: ${err}`, 
            icon: ICON_PATH 
          });
        } finally {
          isSyncing = false;
          refreshMenu();
        }
      }
    }
  } catch (err) {
    log(`Failed to fetch sync config: ${err}`, 'ERROR');
  }
}

// --- Config Utils ---
const CONFIG_FILE = path.join(process.cwd(), 'config.json');
function getLocalConfig() {
  if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  return {};
}
function saveLocalConfig(config: any) {
  const current = getLocalConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...config }, null, 2));
}

// --- Lifecycle ---
let syncTimer: NodeJS.Timeout;
let currentInterval = 60000;

async function startSyncLoop() {
  await fetchConfigAndSync();
  
  // Get current config to check interval
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
      // Fallback to default if fetch fails
      if (!syncTimer) syncTimer = setInterval(fetchConfigAndSync, currentInterval);
    }
  } else {
    if (!syncTimer) syncTimer = setInterval(fetchConfigAndSync, currentInterval);
  }
}

log('Agent Started');
startTray();
startSyncLoop();

UsbScanner.startMonitoring(10000, () => {
  log('USB Change detected');
  fetchConfigAndSync();
});
