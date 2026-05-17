import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

export class Syncer {
  static async startSync(
    driveLetter: string, 
    folder: string, 
    token: string,
    onProgress?: (msg: string) => void,
    serverUrl = 'https://podcast.aremox.com'
  ) {
    const targetDir = path.join(driveLetter, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    onProgress?.('Fetching playlist queue from server...');
    const response = await fetch(`${serverUrl}/api/library/sync-config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const rawConfig = await response.json();
    const config = rawConfig.data || rawConfig;
    const queue = config.queue || [];

    onProgress?.(`Found ${queue.length} items in web queue.`);

    // 1. Clean up files NOT in the queue
    const existingFiles = fs.readdirSync(targetDir).filter(f => f.endsWith('.mp3'));
    const queueFileNames = queue.map((ep: any, index: number) => 
      `${index + 1}. ${this.sanitizeFilename(ep.title)}.mp3`
    );

    for (const file of existingFiles) {
      if (!queueFileNames.includes(file)) {
        onProgress?.(`Removing old or reindexed file: ${file}`);
        try {
          fs.unlinkSync(path.join(targetDir, file));
        } catch (e) {
          // Ignore if already deleted or locked
        }
      }
    }

    // 2. Download missing files
    for (let i = 0; i < queue.length; i++) {
      const ep = queue[i];
      const fileName = `${i + 1}. ${this.sanitizeFilename(ep.title)}.mp3`;
      const filePath = path.join(targetDir, fileName);

      if (!fs.existsSync(filePath)) {
        onProgress?.(`Downloading (${i + 1}/${queue.length}): ${ep.title}`);
        try {
          const downloadUrl = `${serverUrl}/api/proxy/audio/${ep._id}`;
          const res = await fetch(downloadUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          
          const buffer = await res.arrayBuffer();
          await writeFile(filePath, Buffer.from(buffer));
        } catch (err) {
          onProgress?.(`FAILED to download ${ep.title}: ${err}`);
        }
      }
    }

    onProgress?.('Sync complete!');
  }

  private static sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  static getFolderSize(dirPath: string): number {
    if (!fs.existsSync(dirPath)) return 0;
    let totalSize = 0;
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          totalSize += this.getFolderSize(fullPath);
        } else if (stats.isFile()) {
          totalSize += stats.size;
        }
      }
    } catch (e) {
      // Ignore
    }
    return totalSize;
  }
}
