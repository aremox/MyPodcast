import { Injectable, signal, computed, inject } from '@angular/core';
import { PlayerEpisode } from './audio-player.service';
import { HttpClient } from '@angular/common/http';

const STORAGE_KEY = 'playlist_queue';

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private http = inject(HttpClient);
  // Using relative path to match the rest of the app's architecture
  private readonly API_URL = '/api/library';

  /** Full ordered queue */
  readonly queue = signal<PlayerEpisode[]>(this.load());

  /** Index of the currently playing episode within the queue (-1 = not in queue) */
  readonly currentIndex = signal<number>(-1);

  readonly isEmpty = computed(() => this.queue().length === 0);
  readonly hasNext = computed(() => this.currentIndex() < this.queue().length - 1);
  readonly hasPrev = computed(() => this.currentIndex() > 0);
  readonly count = computed(() => this.queue().length);

  // ── Queue management ──────────────────────────────────────────────────────

  addToQueue(episode: PlayerEpisode): void {
    const current = this.queue();
    if (current.some(e => e._id === episode._id)) return;
    this.queue.set([...current, episode]);
    this.save();
  }

  addManyToQueue(episodes: PlayerEpisode[]): void {
    const ids = new Set(this.queue().map(e => e._id));
    const newOnes = episodes.filter(e => !ids.has(e._id));
    if (newOnes.length === 0) return;
    this.queue.update(q => [...q, ...newOnes]);
    this.save();
  }

  remove(episodeId: string): void {
    const idx = this.queue().findIndex(e => e._id === episodeId);
    if (idx === -1) return;
    this.queue.update(q => q.filter(e => e._id !== episodeId));
    if (idx < this.currentIndex()) {
      this.currentIndex.update(i => i - 1);
    } else if (idx === this.currentIndex()) {
      this.currentIndex.set(-1);
    }
    this.save();
  }

  clear(): void {
    this.queue.set([]);
    this.currentIndex.set(-1);
    this.save();
  }

  reorder(fromIndex: number, toIndex: number): void {
    const arr = [...this.queue()];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    this.queue.set(arr);
    this.save();
  }

  isInQueue(episodeId: string): boolean {
    return this.queue().some(e => e._id === episodeId);
  }

  // ── Playback navigation ───────────────────────────────────────────────────

  setCurrentById(episodeId: string): void {
    const idx = this.queue().findIndex(e => e._id === episodeId);
    this.currentIndex.set(idx);
  }

  next(): PlayerEpisode | null {
    const ni = this.currentIndex() + 1;
    if (ni >= this.queue().length) return null;
    this.currentIndex.set(ni);
    return this.queue()[ni];
  }

  prev(): PlayerEpisode | null {
    const pi = this.currentIndex() - 1;
    if (pi < 0) return null;
    this.currentIndex.set(pi);
    return this.queue()[pi];
  }

  // ── Persistence & Cloud Sync ───────────────────────────────────────────────

  private lastLocalUpdate = 0;

  private save(): void {
    try {
      const episodes = this.queue();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(episodes));
      this.lastLocalUpdate = Date.now();
      
      const episodeIds = episodes.map(e => e._id);
      console.log(`[Playlist] Attempting cloud sync with ${episodeIds.length} episodes...`, episodeIds);
      
      this.http.post(`${this.API_URL}/queue`, { episodeIds }).subscribe({
        next: () => {
          console.log('%c[Playlist] Cloud sync SUCCESS ✅', 'color: #00ff00; font-weight: bold');
        },
        error: (err) => {
          console.error('%c[Playlist] Cloud sync ERROR ❌', 'color: #ff0000; font-weight: bold', err);
        }
      });
    } catch (e) {
      console.error('[Playlist] Local save error:', e);
    }
  }

  private load(): PlayerEpisode[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const local = raw ? JSON.parse(raw) : [];
      
      // Also try to sync with server in background
      this.syncWithServer();
      
      return local;
    } catch {
      return [];
    }
  }

  /** Fetch current queue from server to ensure synchronization */
  private syncWithServer(): void {
    this.http.get<{ success: boolean; data: any }>(`${this.API_URL}/sync-config`).subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.queue) {
          // If we recently updated locally, ignore server for a few seconds to let cloud update
          if (Date.now() - this.lastLocalUpdate < 5000) {
            console.log('[Playlist] Ignoring server sync (recent local update)');
            return;
          }

          const serverQueue = res.data.queue.map((ep: any) => ({
            ...ep,
            imageUrl: ep.imageUrl || ep.image || ep.podcastId?.imageUrl,
            audioUrl: ep.audioUrl || ep.url
          }));

          const localIds = JSON.stringify(this.queue().map(e => e._id));
          const serverIds = JSON.stringify(serverQueue.map((e: any) => e._id));
          
          if (localIds !== serverIds) {
            console.log('[Playlist] Updating local queue to match server state');
            this.queue.set(serverQueue);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverQueue));
          }
        }
      },
      error: (err) => console.error('[Playlist] Background sync error:', err)
    });
  }
}
