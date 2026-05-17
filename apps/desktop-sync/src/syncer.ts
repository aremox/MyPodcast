import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { app, Notification } from 'electron';

export class Syncer {
  static async startSync(
    driveLetter: string, 
    folder: string, 
    token: string,
    onProgress?: (msg: string) => void,
    serverUrl = 'https://podcast.aremox.com',
    downloadSpeedLimit = 0
  ): Promise<{ downloaded: number; deleted: number; failed: number; total: number }> {
    const targetDir = path.join(driveLetter, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    onProgress?.('Obteniendo lista de reproducción del servidor...');
    const response = await fetch(`${serverUrl}/api/library/sync-config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const rawConfig = await response.json();
    const config = rawConfig.data || rawConfig;
    const queue = config.queue || [];

    onProgress?.(`Encontrados ${queue.length} episodios en la cola del servidor.`);

    let deletedCount = 0;
    let downloadedCount = 0;
    let failedCount = 0;

    // 1. Scan existing files and identify missing/reindexed/unwanted files in a single pass
    const existingFiles = fs.readdirSync(targetDir).filter(f => f.endsWith('.mp3'));
    const missingItems: { ep: any; index: number; fileName: string; filePath: string }[] = [];

    for (let i = 0; i < queue.length; i++) {
      const ep = queue[i];
      const fileName = `${i + 1}. ${this.sanitizeFilename(ep.title)}.mp3`;
      const filePath = path.join(targetDir, fileName);

      if (fs.existsSync(filePath)) {
        // File is already perfectly named and positioned.
        // Remove it from the existingFiles list so we don't delete it.
        const idx = existingFiles.indexOf(fileName);
        if (idx > -1) {
          existingFiles.splice(idx, 1);
        }
      } else {
        // Check if the file exists under a different index (reindexed due to queue deletions/additions)
        const titlePart = ` ${this.sanitizeFilename(ep.title)}.mp3`;
        const match = existingFiles.find(f => f.endsWith(titlePart));

        if (match) {
          onProgress?.(`Reindexando archivo existente: ${match} -> ${fileName}`);
          try {
            fs.renameSync(path.join(targetDir, match), filePath);
            const idx = existingFiles.indexOf(match);
            if (idx > -1) {
              existingFiles.splice(idx, 1);
            }
          } catch (e) {
            // If rename fails, fallback to treat it as missing so it can be re-downloaded safely
            missingItems.push({ ep, index: i, fileName, filePath });
          }
        } else {
          // Truly missing file
          missingItems.push({ ep, index: i, fileName, filePath });
        }
      }
    }

    // 2. Clean up any remaining files in existingFiles (episodes no longer in the queue, including completed ones)
    for (const file of existingFiles) {
      onProgress?.(`Eliminando archivo antiguo o completado: ${file}`);
      try {
        fs.unlinkSync(path.join(targetDir, file));
        deletedCount++;
      } catch (e) {
        // Ignore if locked or already deleted
      }
    }

    if (missingItems.length > 0) {
      // Setup cover images temp directory
      const tempDir = path.join(app.getPath('temp'), 'MyPodcastCovers');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Determine speed limit per stream
      const maxConcurrent = 3;
      const activeStreams = Math.min(maxConcurrent, missingItems.length);
      const speedLimitPerStream = downloadSpeedLimit > 0 ? Math.floor(downloadSpeedLimit / activeStreams) : 0;

      onProgress?.(`Iniciando descarga concurrente de ${missingItems.length} episodios (Límite: ${downloadSpeedLimit > 0 ? downloadSpeedLimit + ' KB/s total' : 'Sin límite'})...`);

      // Worker pool execution
      const worker = async () => {
        while (missingItems.length > 0) {
          const item = missingItems.shift();
          if (!item) break;
          const { ep, index, fileName, filePath } = item;

          onProgress?.(`Descargando (${index + 1}/${queue.length}): ${ep.title}`);
          try {
            // A. Download Cover Image (if not already cached)
            if (ep.podcastId?.imageUrl && ep.podcastId?.title) {
              const coverFileName = `${this.sanitizeFilename(ep.podcastId.title)}_cover.jpg`;
              const coverFilePath = path.join(tempDir, coverFileName);
              if (!fs.existsSync(coverFilePath)) {
                try {
                  const imgRes = await fetch(ep.podcastId.imageUrl);
                  if (imgRes.ok) {
                    const imgBuf = await imgRes.arrayBuffer();
                    fs.writeFileSync(coverFilePath, Buffer.from(imgBuf));
                  }
                } catch (imgErr) {
                  // Silently ignore cover image download failure
                }
              }
            }

            // B. Download Audio File with Speed Limit
            await this.downloadWithLimit(ep._id, filePath, token, serverUrl, speedLimitPerStream);
            downloadedCount++;

            // C. Show Windows Rich interactive Notification
            this.showRichNotification(ep, targetDir, filePath);
          } catch (err) {
            onProgress?.(`FALLÓ la descarga de ${ep.title}: ${err}`);
            failedCount++;
          }
        }
      };

      const workers = [];
      for (let w = 0; w < Math.min(maxConcurrent, activeStreams); w++) {
        workers.push(worker());
      }
      await Promise.all(workers);
    }

    onProgress?.('¡Sincronización completada!');
    return {
      downloaded: downloadedCount,
      deleted: deletedCount,
      failed: failedCount,
      total: queue.length
    };
  }

  private static async downloadWithLimit(
    episodeId: string,
    filePath: string,
    token: string,
    serverUrl: string,
    speedLimitKbps: number
  ): Promise<void> {
    const downloadUrl = `${serverUrl}/api/proxy/audio/${episodeId}`;
    const res = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error('Response body is empty');
    
    const fileStream = fs.createWriteStream(filePath);
    const reader = res.body.getReader();
    
    const startTime = Date.now();
    let totalBytesDownloaded = 0;
    
    // speedLimitKbps is KB/s. Convert to bytes/ms
    const bytesPerMs = speedLimitKbps > 0 ? (speedLimitKbps * 1024) / 1000 : 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (value) {
          fileStream.write(Buffer.from(value));
          totalBytesDownloaded += value.length;
          
          if (bytesPerMs > 0) {
            const elapsedTime = Date.now() - startTime;
            const expectedTime = totalBytesDownloaded / bytesPerMs;
            const delay = expectedTime - elapsedTime;
            if (delay > 5) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
      }
    } finally {
      fileStream.end();
    }
  }

  private static showRichNotification(ep: any, folderPath: string, filePath: string) {
    try {
      const title = ep.podcastId?.title || 'MyPodcast';
      const body = `Descarga completada: ${ep.title}`;
      
      let coverPath = '';
      const tempDir = path.join(app.getPath('temp'), 'MyPodcastCovers');
      if (ep.podcastId?.title) {
        const coverFileName = `${this.sanitizeFilename(ep.podcastId.title)}_cover.jpg`;
        const possiblePath = path.join(tempDir, coverFileName);
        if (fs.existsSync(possiblePath)) {
          coverPath = possiblePath;
        }
      }

      const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      
      const xmlTitle = escapeXml(title);
      const xmlBody = escapeXml(body);
      const xmlFolderPath = escapeXml(folderPath);
      const xmlFilePath = escapeXml(filePath);
      
      let imageElement = '';
      if (coverPath) {
        imageElement = `<image placement="appLogoOverride" src="${escapeXml(coverPath)}" hint-crop="circle" />`;
      }
      
      const toastXml = `
        <toast>
          <visual>
            <binding template="ToastGeneric">
              <text>${xmlTitle}</text>
              <text>${xmlBody}</text>
              ${imageElement}
            </binding>
          </visual>
          <actions>
            <action content="Abrir Carpeta" arguments="mypodcastsync://open-folder?path=${encodeURIComponent(folderPath)}" activationType="protocol" />
            <action content="Reproducir" arguments="mypodcastsync://play?file=${encodeURIComponent(filePath)}" activationType="protocol" />
          </actions>
        </toast>
      `.trim();
      
      const notif = new Notification({ toastXml });
      notif.show();
    } catch (err) {
      console.error('Error showing Windows Rich Notification:', err);
    }
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
