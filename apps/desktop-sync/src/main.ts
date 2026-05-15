import express from 'express';
import cors from 'cors';
import SysTray from 'systray2';
import axios from 'axios';
import { UsbScanner, UsbDrive } from './usb-scanner';
import { ConfigManager } from './config-manager';
import { Syncer } from './syncer';

const PORT = 31415;
const BASE_URL = 'https://podcast.aremox.com/api/library';
const app = express();

app.use(cors());
app.use(express.json());

let isSyncing = false;
const iconPath = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3goXFSczUnmSbwAAAJ9JREFUOMvNU8ENgzAMfBsh6pAs0S7RLmE6S9SWSIdol8AnIAn6oZ6CAnpBfByf7S93ThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OThI9fV/OH6/rT5K4e1UAAAAASUVORK5CYII=";

const menuItems = [
  { title: "Configuración (Web)", tooltip: "Abrir el panel de control", checked: false, enabled: true },
  { title: "Vincular con mi cuenta", tooltip: "Introducir código de vinculación", checked: false, enabled: true },
  { title: "Sincronizar ahora", tooltip: "Forzar sincronización manual", checked: false, enabled: true },
  { title: "Reiniciar", tooltip: "Reiniciar el agente", checked: false, enabled: true },
  { title: "---", tooltip: "", checked: false, enabled: false },
  { title: "Salir", tooltip: "Cerrar el agente", checked: false, enabled: true },
];

const systray = new SysTray({
  menu: {
    icon: iconPath,
    title: "MyPodcast Sync",
    tooltip: "MyPodcast USB Auto-Sync",
    items: menuItems,
  },
  debug: false,
  copyDir: true,
});

systray.onClick(action => {
  if (action.seq_id === 0) {
    require('child_process').exec('start https://podcast.aremox.com/desktop-sync');
  } else if (action.seq_id === 1) {
    promptForPairingCode();
  } else if (action.seq_id === 2) {
    fetchConfigAndSync();
  } else if (action.seq_id === 3) {
    const { spawn } = require('child_process');
    const child = spawn(process.argv[0], process.argv.slice(1), { detached: true, stdio: 'ignore' });
    child.unref();
    process.exit(0);
  } else if (action.seq_id === 5) {
    systray.kill();
    process.exit(0);
  }
});

async function promptForPairingCode() {
  const { exec } = require('child_process');
  const script = `
    Add-Type -AssemblyName Microsoft.VisualBasic;
    [Microsoft.VisualBasic.Interaction]::InputBox("Introduce el código de 6 dígitos que aparece en la web:", "Vincular MyPodcast Agent", "")
  `;
  
  exec(`powershell -Command "${script}"`, async (error, stdout) => {
    const code = stdout.trim();
    if (code && code.length === 6) {
      console.log(`[Pairing] Validating code: ${code}...`);
      try {
        const res = await axios.post(`${BASE_URL}/pair/validate`, { code });
        if (res.data.success && res.data.accessToken) {
          ConfigManager.saveConfig({
            ...ConfigManager.getConfig(),
            jwtToken: res.data.accessToken
          });
          console.log('[Pairing] SUCCESS! Agent linked.');
          require('child_process').exec('powershell -Command "[Reflection.Assembly]::LoadWithPartialName(\'System.Windows.Forms\'); [System.Windows.Forms.MessageBox]::Show(\'¡Agente vinculado correctamente!\', \'Éxito\')"');
          fetchConfigAndSync();
        } else {
          console.error('[Pairing] FAILED:', res.data.message);
          require('child_process').exec(`powershell -Command "[Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Código inválido o expirado: ${res.data.message}', 'Error')"`);
        }
      } catch (e) {
        console.error('[Pairing] Connection error:', e.message);
      }
    }
  });
}

// --- Cloud Polling Logic ---
async function fetchConfigAndSync() {
  const localConfig = ConfigManager.getConfig();
  if (!localConfig.jwtToken) {
    console.log('[CloudSync] Not linked. Please use "Vincular con mi cuenta" in the tray menu.');
    return;
  }

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
        console.log(`[CloudSync] Syncing to ${drive.volumeName}...`);
        isSyncing = true;
        updateTrayStatus(true);
        await Syncer.startSync(drive.deviceId, remoteConfig.targetFolder, localConfig.jwtToken);
        isSyncing = false;
        updateTrayStatus(false);
      }
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('[CloudSync] Token expired. Please re-link your account.');
    } else {
      console.error('[CloudSync] Error:', error.message);
    }
  }
}

function updateTrayStatus(syncing: boolean) {
  systray.sendAction({
    type: 'update-menu',
    menu: {
      icon: iconPath,
      title: syncing ? "MyPodcast Sync (Sincronizando...)" : "MyPodcast Sync",
      tooltip: syncing ? "Sincronizando con el USB..." : "MyPodcast USB Auto-Sync",
      items: menuItems
    }
  });
}

setInterval(fetchConfigAndSync, 60000);
UsbScanner.startMonitoring(5000, (drive: UsbDrive) => {
  if (ConfigManager.getConfig().targetUsbSerial === drive.serialNumber) fetchConfigAndSync();
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[DesktopSync] Agent status API on http://127.0.0.1:${PORT}`);
});
