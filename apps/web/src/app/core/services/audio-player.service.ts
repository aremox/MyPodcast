import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from '../auth/auth.service';
import { PlaylistService } from './playlist.service';

export interface PlayerEpisode {
  _id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  duration?: string;
  durationSeconds?: number;
  podcastId: string;
  podcastTitle?: string;
  podcastImageUrl?: string;
  publishedAt?: Date | string;
}

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.3 | 1.5 | 1.75 | 2;

@Injectable({ providedIn: 'root' })
export class AudioPlayerService {
  private audio = new Audio();
  private progressInterval: any;
  private saveInterval: any;
  private pendingSeek: number | null = null; // pending seek position for race-condition-safe restore

  // Signals
  readonly currentEpisode = signal<PlayerEpisode | null>(null);
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly buffered = signal(0);
  readonly volume = signal(1);
  readonly speed = signal<PlaybackSpeed>(1);
  readonly isLoading = signal(false);

  /** Injected after construction to avoid circular dependency */
  playlist!: PlaylistService;

  readonly progress = computed(() => {
    const d = this.duration();
    return d > 0 ? (this.currentTime() / d) * 100 : 0;
  });

  readonly formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  readonly formattedDuration = computed(() => this.formatTime(this.duration()));

  constructor(private api: ApiService, private auth: AuthService) {
    // Use inject to avoid circular DI; PlaylistService depends on nothing
    this.playlist = inject(PlaylistService);
    this.setupAudioListeners();
    this.restoreState();
    this.setupMediaSession();
  }

  async play(episode: PlayerEpisode): Promise<void> {
    const isSameEpisode = this.currentEpisode()?._id === episode._id;

    if (!isSameEpisode) {
      this.currentEpisode.set(episode);
      this.isLoading.set(true);
      this.pendingSeek = null;

      // Build authenticated audio URL with JWT as query param
      // (native <audio> cannot send Authorization headers)
      this.loadAudioWithAuth(episode._id);

      // Try to restore progress from server (cross-device)
      try {
        const res = await this.api.getEpisodeProgress(episode._id);
        if (res?.data?.progress && !res.data.completed) {
          // Store as pending seek — will be applied on loadedmetadata (race-condition-safe)
          this.pendingSeek = res.data.progress;
        }
      } catch {}
    }

    try {
      await this.audio.play();
      this.isPlaying.set(true);
      this.startProgressTracking();
    } catch (error) {
      console.error('Error playing audio:', error);
      this.isLoading.set(false);
    }
  }

  pause(): void {
    this.audio.pause();
    this.isPlaying.set(false);
    this.stopProgressTracking();
    this.saveProgress();
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else if (this.currentEpisode()) {
      this.play(this.currentEpisode()!);
    }
  }

  playNext(): void {
    const next = this.playlist?.next();
    if (next) this.play(next);
  }

  playPrev(): void {
    const prev = this.playlist?.prev();
    if (prev) this.play(prev);
  }

  seek(seconds: number): void {
    if (!isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
      this.currentTime.set(this.audio.currentTime);
    }
  }

  seekRelative(delta: number): void {
    this.seek(this.audio.currentTime + delta);
  }

  seekToPercent(percent: number): void {
    if (!isNaN(this.audio.duration)) {
      this.seek((percent / 100) * this.audio.duration);
    }
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed.set(speed);
    this.audio.playbackRate = speed;
    localStorage.setItem('playerSpeed', String(speed));
  }

  setVolume(vol: number): void {
    this.volume.set(vol);
    this.audio.volume = vol;
  }

  stop(): void {
    this.saveProgress();
    this.audio.pause();
    this.audio.src = '';
    this.currentEpisode.set(null);
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.duration.set(0);
    this.stopProgressTracking();
  }

  private loadAudioWithAuth(episodeId: string): void {
    // The proxy endpoint accepts JWT as a ?token= query param
    // This allows the native <audio> element to stream audio with auth
    const proxyUrl = this.api.getAudioProxyUrl(episodeId);
    const token = this.auth.token();
    const url = token ? `${proxyUrl}?token=${encodeURIComponent(token)}` : proxyUrl;
    this.audio.src = url;
  }

  private setupAudioListeners(): void {
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio.duration);
      this.isLoading.set(false);
      // Apply pending seek (race-condition-safe position restore)
      if (this.pendingSeek !== null && this.pendingSeek > 0) {
        this.audio.currentTime = this.pendingSeek;
        this.currentTime.set(this.pendingSeek);
        this.pendingSeek = null;
      }
    });

    this.audio.addEventListener('canplay', () => {
      this.isLoading.set(false);
    });

    this.audio.addEventListener('waiting', () => {
      this.isLoading.set(true);
    });

    this.audio.addEventListener('playing', () => {
      this.isLoading.set(false);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.stopProgressTracking();
      this.markCompleted();
      // Auto-play next episode in playlist
      const next = this.playlist?.next();
      if (next) {
        this.play(next);
      }
    });

    this.audio.addEventListener('error', () => {
      this.isLoading.set(false);
      this.isPlaying.set(false);
      console.error('Audio error:', this.audio.error);
    });

    this.audio.addEventListener('progress', () => {
      if (this.audio.buffered.length > 0) {
        this.buffered.set(this.audio.buffered.end(this.audio.buffered.length - 1));
      }
    });
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      this.currentTime.set(this.audio.currentTime);
    }, 250);

    // Save progress every 10 seconds
    this.saveInterval = setInterval(() => {
      this.saveProgress();
    }, 10000);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  private async saveProgress(): Promise<void> {
    const ep = this.currentEpisode();
    if (!ep) return;

    const progress = Math.floor(this.audio.currentTime);
    const completed = !isNaN(this.audio.duration) &&
      this.audio.currentTime >= this.audio.duration - 5;

    try {
      await this.api.updateProgress(ep._id, ep.podcastId, progress, completed);
    } catch {}

    // Also save locally for instant restore
    localStorage.setItem('playerState', JSON.stringify({
      episodeId: ep._id,
      progress,
      episode: ep,
    }));
  }

  private async markCompleted(): Promise<void> {
    const ep = this.currentEpisode();
    if (!ep) return;
    try {
      await this.api.updateProgress(ep._id, ep.podcastId, Math.floor(this.audio.duration), true);
    } catch {}
  }

  private restoreState(): void {
    // Restore speed
    const savedSpeed = localStorage.getItem('playerSpeed');
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed) as PlaybackSpeed;
      this.speed.set(speed);
      this.audio.playbackRate = speed;
    }

    // Restore last playing episode and auto-resume
    const raw = localStorage.getItem('playerState');
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as { episodeId: string; progress: number; episode: PlayerEpisode };
      if (!state?.episode?._id) return;

      const ep = state.episode;
      this.currentEpisode.set(ep);
      this.isLoading.set(true);
      this.pendingSeek = state.progress || 0;
      this.loadAudioWithAuth(ep._id);

      // Auto-play after a short delay to let the browser load enough audio
      setTimeout(async () => {
        try {
          await this.audio.play();
          this.isPlaying.set(true);
          this.startProgressTracking();
        } catch (e) {
          // Autoplay blocked by browser policy — user will see the episode loaded but paused
          this.isPlaying.set(false);
          this.isLoading.set(false);
        }
      }, 800);
    } catch {
      localStorage.removeItem('playerState');
    }
  }

  private setupMediaSession(): void {
    if (!('mediaSession' in navigator)) return;

    effect(() => {
      const ep = this.currentEpisode();
      if (!ep) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: ep.title,
        artist: ep.podcastTitle || '',
        album: ep.podcastTitle || 'MyPodcast',
        artwork: ep.podcastImageUrl
          ? [{ src: ep.podcastImageUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    });

    navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => this.seekRelative(-15));
    navigator.mediaSession.setActionHandler('seekforward', () => this.seekRelative(30));
    navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
