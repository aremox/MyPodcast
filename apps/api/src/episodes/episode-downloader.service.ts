import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Episode, EpisodeDocument } from './schemas/episode.schema';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class EpisodeDownloaderService {
  private readonly logger = new Logger(EpisodeDownloaderService.name);
  private readonly downloadsDir = path.join(process.cwd(), 'downloads');
  private readonly activeDownloads = new Map<string, Promise<void>>();

  constructor(
    @InjectModel(Episode.name) private episodeModel: Model<EpisodeDocument>,
  ) {
    // Ensure downloads directory exists
    if (!fs.existsSync(this.downloadsDir)) {
      try {
        fs.mkdirSync(this.downloadsDir, { recursive: true });
        this.logger.log(`[Downloader] Created downloads directory at: ${this.downloadsDir}`);
      } catch (err) {
        this.logger.error(`[Downloader] Failed to create downloads directory: ${err.message}`);
      }
    }
  }

  /**
   * Triggers download for a list of episode IDs in the background.
   */
  triggerDownloads(episodeIds: (string | Types.ObjectId)[]) {
    if (!episodeIds || episodeIds.length === 0) return;
    
    const uniqueIds = Array.from(new Set(episodeIds.map(id => id.toString())));
    this.logger.log(`[Downloader] Triggered background downloads check for ${uniqueIds.length} episodes`);
    
    for (const id of uniqueIds) {
      this.downloadEpisode(id).catch(err => {
        this.logger.error(`[Downloader] Background download failed for episode ${id}: ${err.message}`);
      });
    }
  }

  /**
   * Downloads a single episode's audio in the background.
   */
  async downloadEpisode(episodeId: string): Promise<void> {
    const finalPath = path.join(this.downloadsDir, `${episodeId}.mp3`);
    
    // 1. Check if already downloaded
    if (fs.existsSync(finalPath)) {
      this.logger.debug(`[Downloader] Episode ${episodeId} already downloaded.`);
      return;
    }

    // 2. Check if currently downloading to prevent duplicate efforts
    if (this.activeDownloads.has(episodeId)) {
      this.logger.debug(`[Downloader] Episode ${episodeId} is already downloading.`);
      return this.activeDownloads.get(episodeId);
    }

    // 3. Start download process and cache the promise
    const downloadPromise = this.executeDownload(episodeId, finalPath);
    this.activeDownloads.set(episodeId, downloadPromise);

    try {
      await downloadPromise;
    } finally {
      this.activeDownloads.delete(episodeId);
    }
  }

  private async executeDownload(episodeId: string, finalPath: string): Promise<void> {
    const tempPath = `${finalPath}.tmp`;
    
    try {
      this.logger.log(`[Downloader] Fetching episode details for ID: ${episodeId}`);
      const episode = await this.episodeModel.findById(episodeId).exec();
      if (!episode) {
        throw new Error(`Episode not found`);
      }
      if (!episode.audioUrl) {
        throw new Error(`Episode has no audio URL`);
      }

      this.logger.log(`[Downloader] Starting download for episode "${episode.title}" from: ${episode.audioUrl}`);
      
      const writer = fs.createWriteStream(tempPath);
      const response = await axios({
        method: 'get',
        url: episode.audioUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.ivoox.com/',
          'Accept': '*/*',
        },
        timeout: 60000,
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
          writer.close();
          reject(err);
        });
        response.data.on('error', (err) => {
          writer.close();
          reject(err);
        });
      });

      // Atomically move the file from temp to final destination
      await fs.promises.rename(tempPath, finalPath);
      this.logger.log(`[Downloader] Successfully downloaded and saved episode: ${episode.title}`);
    } catch (err) {
      // Clean up temp file on failure
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          this.logger.error(`[Downloader] Failed to clean up temp file ${tempPath}: ${cleanupErr.message}`);
        }
      }
      throw err;
    }
  }
}
