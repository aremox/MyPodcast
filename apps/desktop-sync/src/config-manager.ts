import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_FILE_PATH = path.join(os.homedir(), '.mypodcast-sync.json');

export interface SyncConfig {
  targetUsbSerial?: string;
  targetFolder?: string; // Example: 'Podcasts'
  jwtToken?: string;
}

export class ConfigManager {
  static getConfig(): SyncConfig {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      return {};
    }
    try {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('[ConfigManager] Failed to read config:', e);
      return {};
    }
  }

  static saveConfig(newConfig: Partial<SyncConfig>) {
    const current = this.getConfig();
    const updated = { ...current, ...newConfig };
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }
}
