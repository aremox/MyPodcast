import express from 'express';
import cors from 'cors';
import SysTray from 'systray2';
import axios from 'axios';
import * as path from 'path';
import { UsbScanner, UsbDrive } from './usb-scanner';
import { ConfigManager } from './config-manager';
import { Syncer } from './syncer';

const PORT = 31415;
const BASE_URL = 'https://podcast.aremox.com/api/library';
const app = express();

app.use(cors());
app.use(express.json());

let isSyncing = false;

// USE THE NEW ICON FROM ASSETS
const ICON_PATH = path.join(__dirname, 'assets', 'icon.ico');

const menuItems = [
  { title: "Configuración (Web)", tooltip: "Abrir el panel de control", checked: false, enabled: true },
  { title: "Vincular con mi cuenta", tooltip: "Introducir código de vinculación", checked: false, enabled: true },
  { title: "Sincronizar ahora", tooltip: "Forzar sincronización manual", checked: false, enabled: true },
  { title: "Reiniciar Agente", tooltip: "Reiniciar el proceso", checked: false, enabled: true },
  { title: "---", tooltip: "", checked: false, enabled: false },
  { title: "Salir", tooltip: "Cerrar el agente", checked: false, enabled: true },
];

const systray = new SysTray({
  menu: { 
    icon: ICON_PATH, 
    title: "MyPodcast Sync", 
    tooltip: "MyPodcast USB Auto-Sync", 
    items: menuItems 
  },
  debug: false,
  copyDir: true,
});

systray.onClick(action => {
  const title = action.item.title;
  if (title === "Configuración (Web)") {
    require('child_process').exec('start https://podcast.aremox.com/desktop-sync');
  } else if (title === "Vincular con mi cuenta") {
    promptForPairingCode();
  } else if (title === "Sincronizar ahora") {
    fetchConfigAndSync();
  } else if (title === "Reiniciar Agente") {
    const { spawn } = require('child_process');
    const child = spawn(process.argv[0], process.argv.slice(1), { detached: true, stdio: 'ignore' });
    child.unref();
    process.exit(0);
  } else if (title === "Salir") {
    systray.kill();
    process.exit(0);
  }
});

async function promptForPairingCode() {
  const { exec } = require('child_process');
  const vbsPath = path.join(process.cwd(), 'prompt.vbs');
  const fs = require('fs');
  fs.writeFileSync(vbsPath, `
    Dim code
    code = InputBox("Introduce el codigo de 6 digitos de la web:", "Vincular MyPodcast")
    WScript.Echo "RESULT:" & code
  `);

  exec(`cscript //nologo "${vbsPath}"`, async (error, stdout) => {
    const output = stdout.trim();
    if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath);

    if (output.startsWith("RESULT:") && output.length > 7) {
      const code = output.replace("RESULT:", "").replace(/-/g, "").trim();
      try {
        const res = await axios.post(`${BASE_URL}/pair/validate`, { code });
        if (res.data.success && res.data.accessToken) {
          ConfigManager.saveConfig({ ...ConfigManager.getConfig(), jwtToken: res.data.accessToken });
          exec(`powershell -Command "[Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('¡Vinculado correctamente!', 'MyPodcast')"`);
          fetchConfigAndSync();
        } else {
          exec(`powershell -Command "[Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Error: ${res.data.message}', 'Error')"`);
        }
      } catch (e) {
        console.error('[Pairing] Error:', e.message);
      }
    }
  });
}

async function fetchConfigAndSync() {
  const localConfig = ConfigManager.getConfig();
  if (!localConfig.jwtToken) return;

  try {
    const response = await axios.get(`${BASE_URL}/sync-config`, {
      headers: { Authorization: `Bearer ${localConfig.jwtToken}` }
    });

    if (response.data.success && response.data.data) {
      const remoteConfig = response.data.data;
      ConfigManager.saveConfig({ 
        ...localConfig, 
        targetUsbSerial: remoteConfig.targetUsbSerial, 
        targetFolder: remoteConfig.targetFolder 
      });
      
      const drives = await UsbScanner.getRemovableDrives();
      const drive = drives.find(d => d.serialNumber === remoteConfig.targetUsbSerial);
      if (drive && !isSyncing) {
        isSyncing = true;
        updateTrayStatus(true);
        await Syncer.startSync(drive.deviceId, remoteConfig.targetFolder, localConfig.jwtToken);
        isSyncing = false;
        updateTrayStatus(false);
      }
    }
  } catch (error) {
    console.error('[Sync] Error:', error.message);
  }
}

function updateTrayStatus(syncing: boolean) {
  systray.sendAction({ 
    type: 'update-menu', 
    menu: { 
      icon: ICON_PATH, 
      title: syncing ? "MyPodcast Sync (Sincronizando...)" : "MyPodcast Sync", 
      tooltip: syncing ? "Sincronizando..." : "USB Auto-Sync", 
      items: menuItems 
    } 
  });
}

setInterval(fetchConfigAndSync, 60000);
UsbScanner.startMonitoring(5000, (drive: UsbDrive) => {
  if (ConfigManager.getConfig().targetUsbSerial === drive.serialNumber) {
    fetchConfigAndSync();
  }
});

app.listen(PORT, '127.0.0.1');
console.log(`[Agent] Ready. Using Backend: ${BASE_URL}`);
