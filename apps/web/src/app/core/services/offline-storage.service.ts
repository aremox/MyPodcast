import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from '../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface DownloadedEpisode {
  _id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  duration?: string;
  podcastId: string;
  podcastTitle?: string;
  podcastImageUrl?: string;
  publishedAt?: string | Date;
  downloadedAt: number;
  sizeBytes: number;
}

export type DownloadState = 'none' | 'downloading' | 'downloaded';

const AUDIO_CACHE_NAME = 'mypodcast-audio-v2';
const DB_NAME = 'mypodcast-offline';
const DB_VERSION = 1;
const STORE_NAME = 'downloaded-episodes';

@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  /** Map of episodeId → download progress (0–100) */
  readonly downloadProgress = signal<Record<string, number>>({});

  /** Set of currently downloading episode IDs */
  readonly activeDownloads = signal<Set<string>>(new Set());

  /** Set of queued episode IDs waiting to download */
  readonly queuedDownloads = signal<Set<string>>(new Set());

  /** Map of episodeId → downloaded metadata */
  readonly downloadedMap = signal<Record<string, DownloadedEpisode>>({});

  /** List of all episodes registered as downloaded (both locally cached and server-only) */
  readonly downloads = computed(() =>
    Object.values(this.downloadedMap())
      .sort((a, b) => b.downloadedAt - a.downloadedAt)
  );

  /** Only episodes fully cached in the browser (sizeBytes > 0) */
  readonly localDownloads = computed(() =>
    this.downloads().filter(d => d.sizeBytes > 0)
  );

  /** Episodes available on server but not yet cached locally in the browser */
  readonly serverDownloads = computed(() =>
    this.downloads().filter(d => d.sizeBytes === 0)
  );

  /** Total size of locally cached downloaded episodes */
  readonly totalSize = computed(() =>
    this.localDownloads().reduce((sum, d) => sum + d.sizeBytes, 0)
  );

  /** Returns true if the episode is physically cached in the browser's Cache Storage */
  isCachedLocally(episodeId: string): boolean {
    const meta = this.downloadedMap()[episodeId];
    return !!meta && meta.sizeBytes > 0;
  }

  private downloadQueue: {
    _id: string;
    title: string;
    audioUrl: string;
    imageUrl?: string;
    duration?: string;
    podcastId: string;
    podcastTitle?: string;
    podcastImageUrl?: string;
    publishedAt?: string | Date;
  }[] = [];
  private isProcessingQueue = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private http: HttpClient,
  ) {
    this.loadDownloadedMetadata();
  }

  /** Check the download state of an episode */
  getState(episodeId: string): DownloadState {
    if (this.activeDownloads().has(episodeId) || this.queuedDownloads().has(episodeId)) return 'downloading';
    if (this.downloadedMap()[episodeId]) return 'downloaded';
    return 'none';
  }

  /** Enqueue an episode to download sequentially */
  async download(episode: {
    _id: string;
    title: string;
    audioUrl: string;
    imageUrl?: string;
    duration?: string;
    podcastId: string;
    podcastTitle?: string;
    podcastImageUrl?: string;
    publishedAt?: string | Date;
  }): Promise<void> {
    if (this.getState(episode._id) !== 'none') return;

    // Check if already in queue
    if (this.downloadQueue.some(ep => ep._id === episode._id)) return;

    // Mark as queued/downloading
    this.queuedDownloads.update(s => { const n = new Set(s); n.add(episode._id); return n; });
    this.downloadProgress.update(p => ({ ...p, [episode._id]: 0 }));

    // Add to queue
    this.downloadQueue.push(episode);

    // Trigger queue processor (async, non-blocking)
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (this.downloadQueue.length > 0) {
        const nextEpisode = this.downloadQueue.shift();
        if (nextEpisode) {
          // Remove from queuedDownloads just before starting active download
          this.queuedDownloads.update(s => { const n = new Set(s); n.delete(nextEpisode._id); return n; });
          await this.executeDownload(nextEpisode);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /** Actual execution of a single episode download */
  private async executeDownload(episode: {
    _id: string;
    title: string;
    audioUrl: string;
    imageUrl?: string;
    duration?: string;
    podcastId: string;
    podcastTitle?: string;
    podcastImageUrl?: string;
    publishedAt?: string | Date;
  }): Promise<void> {
    // Mark as active downloading
    this.activeDownloads.update(s => { const n = new Set(s); n.add(episode._id); return n; });
    this.downloadProgress.update(p => ({ ...p, [episode._id]: 0 }));

    try {
      const audioUrl = this.api.getAudioProxyUrl(episode._id);

      // Fetch with progress tracking — include auth token
      const headers: Record<string, string> = {};
      const token = this.auth.token();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(audioUrl, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = Number(response.headers.get('content-length') || 0);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      // Read stream with progress
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;

        if (contentLength > 0) {
          const pct = Math.round((received / contentLength) * 100);
          this.downloadProgress.update(p => ({ ...p, [episode._id]: pct }));
        }
      }

      // Reassemble into a Response and cache it
      const blob = new Blob(chunks as BlobPart[], {
        type: response.headers.get('content-type') || 'audio/mpeg',
      });
      const cachedResponse = new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
          'Content-Length': String(blob.size),
        },
      });

      // Put into the same cache the Service Worker uses
      const cache = await caches.open(AUDIO_CACHE_NAME);
      await cache.put(new Request(audioUrl), cachedResponse);

      // Save metadata to IndexedDB
      const meta: DownloadedEpisode = {
        _id: episode._id,
        title: episode.title,
        audioUrl: episode.audioUrl,
        imageUrl: episode.imageUrl,
        duration: episode.duration,
        podcastId: episode.podcastId,
        podcastTitle: episode.podcastTitle,
        podcastImageUrl: episode.podcastImageUrl,
        publishedAt: episode.publishedAt,
        downloadedAt: Date.now(),
        sizeBytes: blob.size,
      };
      await this.saveMetadata(meta);

      // Update signals
      this.downloadedMap.update(m => ({ ...m, [episode._id]: meta }));
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      this.activeDownloads.update(s => { const n = new Set(s); n.delete(episode._id); return n; });
      this.downloadProgress.update(p => { const n = { ...p }; delete n[episode._id]; return n; });
    }
  }

  /**
   * Sync server-side downloaded status for a list of episodes.
   * For each episode the server has fully downloaded, mark it locally as downloaded
   * WITHOUT re-downloading through the browser proxy.
   * Call this after triggering a server-side batch download.
   */
  async syncServerDownloads(
    episodes: {
      _id: string;
      title: string;
      audioUrl: string;
      imageUrl?: string;
      duration?: string;
      podcastId: string;
      podcastTitle?: string;
      podcastImageUrl?: string;
      publishedAt?: string | Date;
    }[],
    pollIntervalMs = 15000,
    maxAttempts = 80, // 80 * 15s = 20 min max
  ): Promise<void> {
    if (!episodes || episodes.length === 0) return;

    const episodeIds = episodes.map(e => e._id);
    const remaining = new Set(episodeIds);

    console.log(`[OfflineStorage] Starting server-sync poll for ${episodeIds.length} episodes`);

    for (let attempt = 0; attempt < maxAttempts && remaining.size > 0; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      try {
        const res = await firstValueFrom(
          this.http.post<{ success: boolean; downloaded: string[]; pending: string[] }>(
            '/api/episodes/download-status',
            { episodeIds: Array.from(remaining) },
          ),
        );

        if (res.success && res.downloaded?.length > 0) {
          for (const id of res.downloaded) {
            if (!remaining.has(id)) continue;
            remaining.delete(id);

            const ep = episodes.find(e => e._id === id);
            if (!ep) continue;

            // Trigger actual local browser download now that the server has it cached.
            // Since the server has already downloaded the audio file to its local disk,
            // the browser's download will fetch it instantly and robustly without any 502s!
            // Use isCachedLocally to only skip if it is truly in the browser's Cache Storage.
            if (!this.isCachedLocally(id)) {
              console.log(`[OfflineStorage] Episode ${id} is available on server. Triggering local browser download.`);
              this.download(ep);
            }
          }
        }
      } catch (err) {
        console.warn('[OfflineStorage] Server sync poll error:', err);
      }
    }

    console.log(`[OfflineStorage] Server-sync poll finished. ${remaining.size} episodes still pending.`);
  }

  /** Remove a downloaded episode from cache and IndexedDB, or from the pending queue */
  async remove(episodeId: string): Promise<void> {
    // Remove from queue if it is pending
    this.downloadQueue = this.downloadQueue.filter(ep => ep._id !== episodeId);
    this.queuedDownloads.update(s => { const n = new Set(s); n.delete(episodeId); return n; });
    this.downloadProgress.update(p => { const n = { ...p }; delete n[episodeId]; return n; });

    // Remove from Cache API
    try {
      const audioUrl = this.api.getAudioProxyUrl(episodeId);
      const cache = await caches.open(AUDIO_CACHE_NAME);
      await cache.delete(new Request(audioUrl));
    } catch {}

    // Remove from IndexedDB
    await this.deleteMetadata(episodeId);

    // Update signal
    this.downloadedMap.update(m => {
      const n = { ...m };
      delete n[episodeId];
      return n;
    });
  }

  /** Clear all downloaded episodes and pending downloads */
  async clearAll(): Promise<void> {
    this.downloadQueue = [];
    this.queuedDownloads.set(new Set());
    this.downloadProgress.set({});
    try {
      await caches.open(AUDIO_CACHE_NAME).then(cache => cache.keys().then(keys => {
        return Promise.all(keys.map(k => cache.delete(k)));
      }));
    } catch {}
    await this.clearAllMetadata();
    this.downloadedMap.set({});
  }

  /** Format bytes to human-readable string */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  // ===== IndexedDB helpers =====
  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: '_id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async saveMetadata(meta: DownloadedEpisode): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(meta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async deleteMetadata(id: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async clearAllMetadata(): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async loadDownloadedMetadata(): Promise<void> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const map: Record<string, DownloadedEpisode> = {};
        for (const item of req.result) {
          map[item._id] = item;
        }
        this.downloadedMap.set(map);
      };
    } catch (err) {
      console.error('Failed to load download metadata:', err);
    }
  }
}
