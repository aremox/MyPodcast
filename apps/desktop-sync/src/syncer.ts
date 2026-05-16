import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';

const API_BASE_URL = 'https://podcast.aremox.com/api';

export class Syncer {
  static async startSync(targetDrivePath: string, folderName: string, jwtToken: string) {
    console.log(`[Syncer] Starting sync to ${targetDrivePath}\\${folderName}`);
    
    try {
      const targetPath = path.join(targetDrivePath, folderName);
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      console.log(`[Syncer] Fetching sync config...`);
      const response = await axios.get(`${API_BASE_URL}/library/sync-config`, {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      
      const config = response.data.data;
      const queue = config?.queue || [];
      
      console.log(`[Syncer] RAW Queue length from server: ${queue.length}`);
      if (queue.length > 0) {
        console.log(`[Syncer] First item in queue:`, JSON.stringify(queue[0]).substring(0, 200));
      }

      const expectedFiles = new Set<string>();
      queue.forEach((episode: any, index: number) => {
        if (!episode) {
          console.warn(`[Syncer] Null episode at index ${index}`);
          return;
        }
        // Manejar tanto si es el objeto poblado como si es solo el ID
        const title = episode.title || `Episode-${episode._id || episode}`;
        const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '').substring(0, 100);
        const fileName = `${index + 1}. ${safeTitle}.mp3`;
        expectedFiles.add(fileName);
        console.log(`[Syncer] Expected file: ${fileName}`);
      });

      const existingFiles = fs.readdirSync(targetPath);
      console.log(`[Syncer] Found ${existingFiles.length} files on USB.`);

      for (const file of existingFiles) {
        if (file.endsWith('.mp3') && !expectedFiles.has(file)) {
          console.log(`[Syncer] Cleaning up (removing): ${file}`);
          try {
            fs.unlinkSync(path.join(targetPath, file));
          } catch (err) {
            console.error(`[Syncer] Failed to delete ${file}:`, err.message);
          }
        }
      }

      for (let i = 0; i < queue.length; i++) {
        const episode = queue[i];
        if (!episode) continue;

        const episodeId = episode._id || episode;
        const title = episode.title || `Episode-${episodeId}`;
        const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '').substring(0, 100);
        const fileName = `${i + 1}. ${safeTitle}.mp3`;
        const filePath = path.join(targetPath, fileName);

        if (fs.existsSync(filePath)) {
          console.log(`[Syncer] Already exists: ${fileName}`);
          continue;
        }

        console.log(`[Syncer] Downloading (${i+1}/${queue.length}): ${fileName}`);
        const downloadUrl = `${API_BASE_URL}/proxy/audio/${episodeId}?token=${jwtToken}`;
        
        try {
          const downloadRes = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 60000
          });

          await pipeline(
            downloadRes.data,
            fs.createWriteStream(filePath)
          );
          console.log(`[Syncer] SUCCESS: ${fileName}`);
        } catch (downloadErr: any) {
          console.error(`[Syncer] FAILED to download ${fileName}:`, downloadErr.message);
        }
      }

      console.log(`[Syncer] Sync complete!`);
    } catch (e: any) {
      console.error(`[Syncer] Sync global error:`, e.message);
      if (e.response) console.error(`[Syncer] Server response error:`, e.response.status, e.response.data);
    }
  }
}
