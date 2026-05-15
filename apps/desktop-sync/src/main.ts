import express from 'express';
import cors from 'cors';
import SysTray from 'systray2';
import { UsbScanner, UsbDrive } from './usb-scanner';
import { ConfigManager } from './config-manager';
import { Syncer } from './syncer';

const PORT = 31415;
const app = express();

app.use(cors());
app.use(express.json());

let isSyncing = false;

// Basic base64 icon (small black square) as fallback
const base64Icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// --- Express API ---
app.get('/status', async (req, res) => {
  const drives = await UsbScanner.getRemovableDrives();
  res.json({
    status: 'running',
    isSyncing,
    config: ConfigManager.getConfig(),
    connectedDrives: drives
  });
});

app.post('/config', (req, res) => {
  const { targetUsbSerial, targetFolder, jwtToken } = req.body;
  const newConfig = ConfigManager.saveConfig({ targetUsbSerial, targetFolder, jwtToken });
  res.json({ success: true, config: newConfig });
});

const menuItems = [
  {
    title: "Open Settings",
    tooltip: "Open the web app to configure",
    checked: false,
    enabled: true,
  },
  {
    title: "Exit",
    tooltip: "Close the background sync agent",
    checked: false,
    enabled: true,
  },
];

// --- Tray Icon ---
const systray = new SysTray({
  menu: {
    icon: base64Icon,
    title: "MyPodcast Sync",
    tooltip: "MyPodcast USB Auto-Sync",
    items: menuItems,
  },
  debug: false,
  copyDir: true,
});

systray.onClick(action => {
  if (action.seq_id === 0) {
    // Open settings: just open the website
    const { exec } = require('child_process');
    exec('start https://podcast.aremox.com');
  } else if (action.seq_id === 1) {
    systray.kill();
    process.exit(0);
  }
});

// --- USB Monitoring ---
UsbScanner.startMonitoring(5000, async (drive: UsbDrive) => {
  const config = ConfigManager.getConfig();
  
  if (config.targetUsbSerial && config.targetUsbSerial === drive.serialNumber) {
    console.log(`[AutoSync] Target USB connected: ${drive.volumeName}`);
    
    if (isSyncing) {
      console.log(`[AutoSync] Already syncing, ignoring...`);
      return;
    }

    if (!config.jwtToken || !config.targetFolder) {
      console.log(`[AutoSync] Missing JWT token or target folder in config!`);
      return;
    }

    isSyncing = true;
    // Optional: Update Tray tooltip to indicate syncing
    systray.sendAction({
      type: 'update-menu',
      menu: {
        icon: base64Icon,
        title: "MyPodcast Sync (Syncing...)",
        tooltip: "Syncing to USB...",
        items: menuItems
      }
    });

    await Syncer.startSync(drive.deviceId, config.targetFolder, config.jwtToken);
    
    isSyncing = false;
    systray.sendAction({
      type: 'update-menu',
      menu: {
        icon: base64Icon,
        title: "MyPodcast Sync",
        tooltip: "MyPodcast USB Auto-Sync",
        items: menuItems
      }
    });
  }
});

// --- Start Server ---
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[DesktopSync] Agent running on http://127.0.0.1:${PORT}`);
});
