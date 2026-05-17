import { Injectable, signal, computed, inject } from '@angular/core';
import { PlayerEpisode } from './audio-player.service';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

const STORAGE_KEY = 'playlist_queue';

export interface SmartRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'prepend_short' | 'prioritize_unplayed' | 'group_by_podcast' | 'round_robin' | 'sort_by_duration' | 'sort_by_date';
  config?: any;
}

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
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

  // Smart Rules Signals
  readonly rules = signal<SmartRule[]>(this.loadRules());
  readonly autoApplyRules = signal<boolean>(this.loadAutoApply());
  readonly isApplyingRules = signal<boolean>(false);

  // ── Queue management ──────────────────────────────────────────────────────

  addToQueue(episode: PlayerEpisode): void {
    const current = this.queue();
    if (current.some(e => e._id === episode._id)) return;
    this.queue.set([...current, episode]);
    this.save();
    if (this.autoApplyRules()) {
      this.applyRulesNow();
    }
  }

  addManyToQueue(episodes: PlayerEpisode[]): void {
    const ids = new Set(this.queue().map(e => e._id));
    const newOnes = episodes.filter(e => !ids.has(e._id));
    if (newOnes.length === 0) return;
    this.queue.update(q => [...q, ...newOnes]);
    this.save();
    if (this.autoApplyRules()) {
      this.applyRulesNow();
    }
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

  // ── Smart Rules Implementation ──────────────────────────────────────────

  private loadRules(): SmartRule[] {
    try {
      const raw = localStorage.getItem('playlist_smart_rules');
      if (raw) return JSON.parse(raw);
    } catch {}
    
    return [
      {
        id: 'prioritize_unplayed',
        name: 'Priorizar no escuchados / Empezados',
        description: 'Mueve arriba de la cola los episodios que están a medias o sin empezar.',
        enabled: false,
        type: 'prioritize_unplayed',
        config: { mode: 'in_progress_first' }
      },
      {
        id: 'prepend_short',
        name: 'Auto-añadir cortos al inicio',
        description: 'Coloca automáticamente al inicio los episodios de duración corta (< 10 min).',
        enabled: false,
        type: 'prepend_short',
        config: { podcastId: '', maxMinutes: 10 }
      },
      {
        id: 'group_by_podcast',
        name: 'Agrupar por Podcast (Maratón)',
        description: 'Agrupa consecutivamente los episodios del mismo podcast.',
        enabled: false,
        type: 'group_by_podcast'
      },
      {
        id: 'round_robin',
        name: 'Alternar Podcasts (Variedad)',
        description: 'Distribuye los episodios para intercalar diferentes podcasts.',
        enabled: false,
        type: 'round_robin'
      },
      {
        id: 'sort_by_duration',
        name: 'Priorizar por duración',
        description: 'Ordena la cola según la duración de los episodios.',
        enabled: false,
        type: 'sort_by_duration',
        config: { order: 'shortest_first' }
      },
      {
        id: 'sort_by_date',
        name: 'Ordenar por fecha de publicación',
        description: 'Ordena los episodios cronológicamente.',
        enabled: false,
        type: 'sort_by_date',
        config: { order: 'newest_first' }
      }
    ];
  }

  private loadAutoApply(): boolean {
    try {
      const raw = localStorage.getItem('playlist_auto_apply');
      return raw === 'true';
    } catch {
      return false;
    }
  }

  toggleRule(ruleId: string): void {
    this.rules.update(list => {
      const newList = list.map(r => {
        if (r.id === ruleId) {
          const enabled = !r.enabled;
          return { ...r, enabled };
        }
        // Mutual exclusion between group_by_podcast and round_robin
        if (ruleId === 'group_by_podcast' && r.id === 'round_robin') {
          return { ...r, enabled: false };
        }
        if (ruleId === 'round_robin' && r.id === 'group_by_podcast') {
          return { ...r, enabled: false };
        }
        return r;
      });
      localStorage.setItem('playlist_smart_rules', JSON.stringify(newList));
      return newList;
    });

    if (this.autoApplyRules()) {
      this.applyRulesNow();
    }
  }

  updateRuleConfig(ruleId: string, key: string, value: any): void {
    this.rules.update(list => {
      const newList = list.map(r => {
        if (r.id === ruleId) {
          return { ...r, config: { ...r.config, [key]: value } };
        }
        return r;
      });
      localStorage.setItem('playlist_smart_rules', JSON.stringify(newList));
      return newList;
    });

    if (this.autoApplyRules()) {
      this.applyRulesNow();
    }
  }

  toggleAutoApply(): void {
    const newVal = !this.autoApplyRules();
    this.autoApplyRules.set(newVal);
    localStorage.setItem('playlist_auto_apply', String(newVal));
    if (newVal) {
      this.applyRulesNow();
    }
  }

  async applyRulesNow(): Promise<void> {
    if (this.queue().length === 0) return;
    this.isApplyingRules.set(true);
    try {
      const prioritizeRule = this.rules().find(r => r.id === 'prioritize_unplayed' && r.enabled);
      let inProgressList: any[] = [];
      if (prioritizeRule) {
        try {
          const res = await this.api.getInProgress();
          if (res && res.success && Array.isArray(res.data)) {
            inProgressList = res.data;
          }
        } catch (err) {
          console.error('[PlaylistService] Error fetching progress history for rules:', err);
        }
      }

      const currentQueue = [...this.queue()];
      const sortedQueue = this.executeRules(currentQueue, inProgressList);

      this.queue.set(sortedQueue);
      this.save();
    } finally {
      this.isApplyingRules.set(false);
    }
  }

  private executeRules(queue: PlayerEpisode[], inProgressList: any[]): PlayerEpisode[] {
    let result = [...queue];

    const activeRules = this.rules().filter(r => r.enabled);
    if (activeRules.length === 0) return result;

    const prioritizeRule = activeRules.find(r => r.type === 'prioritize_unplayed');
    const prependRule = activeRules.find(r => r.type === 'prepend_short');
    const groupRule = activeRules.find(r => r.type === 'group_by_podcast');
    const roundRobinRule = activeRules.find(r => r.type === 'round_robin');
    const durationRule = activeRules.find(r => r.type === 'sort_by_duration');
    const dateRule = activeRules.find(r => r.type === 'sort_by_date');

    const getDurationSeconds = (ep: PlayerEpisode): number => {
      if (ep.durationSeconds) return ep.durationSeconds;
      if (!ep.duration) return 0;
      const parts = ep.duration.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return 0;
    };

    // Step 1: Base sorting (Duration / Date)
    if (durationRule) {
      const order = durationRule.config?.order || 'shortest_first';
      result.sort((a, b) => {
        const da = getDurationSeconds(a);
        const db = getDurationSeconds(b);
        return order === 'shortest_first' ? da - db : db - da;
      });
    } else if (dateRule) {
      const order = dateRule.config?.order || 'newest_first';
      result.sort((a, b) => {
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return order === 'newest_first' ? tb - ta : ta - tb;
      });
    }

    // Step 2: Prioritize unplayed / in progress
    if (prioritizeRule) {
      const mode = prioritizeRule.config?.mode || 'in_progress_first';
      const inProgressIds = new Set(inProgressList.map(item => item.episodeId?._id || item.episodeId));
      
      const inProgressEps: PlayerEpisode[] = [];
      const unplayedEps: PlayerEpisode[] = [];
      
      for (const ep of result) {
        if (inProgressIds.has(ep._id)) {
          inProgressEps.push(ep);
        } else {
          unplayedEps.push(ep);
        }
      }

      if (mode === 'in_progress_first') {
        result = [...inProgressEps, ...unplayedEps];
      } else {
        result = [...unplayedEps, ...inProgressEps];
      }
    }

    // Step 3: Grouping vs Round-Robin
    if (groupRule) {
      const groups: { [key: string]: PlayerEpisode[] } = {};
      const orderOfPodcasts: string[] = [];
      
      for (const ep of result) {
        const pid = ep.podcastId;
        if (!groups[pid]) {
          groups[pid] = [];
          orderOfPodcasts.push(pid);
        }
        groups[pid].push(ep);
      }
      
      result = orderOfPodcasts.flatMap(pid => groups[pid]);
    } else if (roundRobinRule) {
      const groups: { [key: string]: PlayerEpisode[] } = {};
      for (const ep of result) {
        const pid = ep.podcastId;
        if (!groups[pid]) groups[pid] = [];
        groups[pid].push(ep);
      }
      
      const lists = Object.values(groups);
      const roundRobin: PlayerEpisode[] = [];
      let added = true;
      let index = 0;
      
      while (added) {
        added = false;
        for (const list of lists) {
          if (index < list.length) {
            roundRobin.push(list[index]);
            added = true;
          }
        }
        index++;
      }
      result = roundRobin;
    }

    // Step 4: Prepend short episodes of specific podcast
    if (prependRule) {
      const targetPodcastId = prependRule.config?.podcastId;
      const maxMinutes = prependRule.config?.maxMinutes || 10;
      const maxSeconds = maxMinutes * 60;
      
      const prependMatches: PlayerEpisode[] = [];
      const rest: PlayerEpisode[] = [];
      
      for (const ep of result) {
        const matchesPodcast = !targetPodcastId || ep.podcastId === targetPodcastId;
        const durationSec = getDurationSeconds(ep);
        
        if (matchesPodcast && durationSec > 0 && durationSec <= maxSeconds) {
          prependMatches.push(ep);
        } else {
          rest.push(ep);
        }
      }
      
      result = [...prependMatches, ...rest];
    }

    return result;
  }
}
