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

  private save(): void {
    try {
      const episodes = this.queue();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(episodes));
      
      const episodeIds = episodes.map(e => e._id);
      console.log('[Playlist] Syncing queue to cloud...', episodeIds);
      
      this.http.post(`${this.API_URL}/queue`, { episodeIds }).subscribe({
        next: () => console.log('[Playlist] Cloud sync SUCCESS'),
        error: (err) => console.error('[Playlist] Cloud sync ERROR:', err)
      });
    } catch (e) {
      console.error('[Playlist] Save error:', e);
    }
  }

  private load(): PlayerEpisode[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
