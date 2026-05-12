import { Injectable, signal, computed } from '@angular/core';
import { PlayerEpisode } from './audio-player.service';

const STORAGE_KEY = 'playlist_queue';

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  /** Full ordered queue */
  readonly queue = signal<PlayerEpisode[]>(this.load());

  /** Index of the currently playing episode within the queue (-1 = not in queue) */
  readonly currentIndex = signal<number>(-1);

  readonly isEmpty = computed(() => this.queue().length === 0);
  readonly hasNext = computed(() => this.currentIndex() < this.queue().length - 1);
  readonly hasPrev = computed(() => this.currentIndex() > 0);
  readonly count = computed(() => this.queue().length);

  // ── Queue management ──────────────────────────────────────────────────────

  /** Add an episode to the end of the queue (ignores duplicates) */
  addToQueue(episode: PlayerEpisode): void {
    const current = this.queue();
    if (current.some(e => e._id === episode._id)) return;
    this.queue.set([...current, episode]);
    this.save();
  }

  /** Add multiple episodes at once (skip already existing) */
  addManyToQueue(episodes: PlayerEpisode[]): void {
    const ids = new Set(this.queue().map(e => e._id));
    const newOnes = episodes.filter(e => !ids.has(e._id));
    if (newOnes.length === 0) return;
    this.queue.update(q => [...q, ...newOnes]);
    this.save();
  }

  /** Remove episode from queue by id */
  remove(episodeId: string): void {
    const idx = this.queue().findIndex(e => e._id === episodeId);
    if (idx === -1) return;

    this.queue.update(q => q.filter(e => e._id !== episodeId));

    // Adjust currentIndex if needed
    if (idx < this.currentIndex()) {
      this.currentIndex.update(i => i - 1);
    } else if (idx === this.currentIndex()) {
      this.currentIndex.set(-1);
    }
    this.save();
  }

  /** Clear the entire queue */
  clear(): void {
    this.queue.set([]);
    this.currentIndex.set(-1);
    this.save();
  }

  /** Reorder via drag-and-drop — move item from oldIndex to newIndex */
  reorder(fromIndex: number, toIndex: number): void {
    const arr = [...this.queue()];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    this.queue.set(arr);

    // Keep currentIndex tracking correct
    const ci = this.currentIndex();
    if (ci === fromIndex) {
      this.currentIndex.set(toIndex);
    } else if (fromIndex < ci && toIndex >= ci) {
      this.currentIndex.update(i => i - 1);
    } else if (fromIndex > ci && toIndex <= ci) {
      this.currentIndex.update(i => i + 1);
    }
    this.save();
  }

  // ── Playback navigation ───────────────────────────────────────────────────

  /** Mark a queue item as currently playing (by id) */
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

  isInQueue(episodeId: string): boolean {
    return this.queue().some(e => e._id === episodeId);
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue()));
    } catch {}
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
