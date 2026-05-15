import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';

const API_BASE_URL = 'http://localhost:3000/api'; // Or production URL if needed

export class Syncer {
  static async startSync(targetDrivePath: string, folderName: string, jwtToken: string) {
    console.log(`[Syncer] Starting sync to ${targetDrivePath}\\${folderName}`);
    
    try {
      // 1. Create target directory if not exists
      const targetPath = path.join(targetDrivePath, folderName);
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      // 2. Fetch Playlist
      console.log(`[Syncer] Fetching playlist...`);
      const playlistRes = await axios.get(`${API_BASE_URL}/playlist`, {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      
      const playlist = playlistRes.data;
      if (!playlist || playlist.length === 0) {
        console.log(`[Syncer] Playlist is empty. Nothing to sync.`);
        return;
      }

      console.log(`[Syncer] Found ${playlist.length} items in playlist.`);

      // 3. Download each item sequentially
      for (let i = 0; i < playlist.length; i++) {
        const item = playlist[i];
        const title = item.episodeId?.title || `Episode-${item.episodeId?._id}`;
        // Sanitize filename for Windows
        const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '').substring(0, 100);
        const fileName = `${i + 1}. ${safeTitle}.mp3`;
        const filePath = path.join(targetPath, fileName);

        console.log(`[Syncer] Syncing (${i+1}/${playlist.length}): ${fileName}`);

        // Download via proxy
        const downloadUrl = `${API_BASE_URL}/proxy/audio/${item.episodeId._id}?token=${jwtToken}&export=true`;
        
        try {
          const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream'
          });

          await pipeline(
            response.data,
            fs.createWriteStream(filePath)
          );
          console.log(`[Syncer] Completed: ${fileName}`);
        } catch (downloadErr: any) {
          console.error(`[Syncer] Failed to download ${fileName}:`, downloadErr.message);
        }
      }

      console.log(`[Syncer] Sync complete!`);
    } catch (e: any) {
      console.error(`[Syncer] Sync failed:`, e.message);
    }
  }
}
