import { Component, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AudioPlayerService, PlayerEpisode } from '../../core/services/audio-player.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { PlaylistService } from '../../core/services/playlist.service';

@Component({
  selector: 'app-podcast-detail',
  imports: [RouterLink],
  template: `
    @if (loading()) {
      <div class="detail-page container">
        <div class="hero">
          <div class="skeleton" style="width:200px;height:200px;border-radius:16px"></div>
          <div class="hero-info">
            <div class="skeleton" style="width:60%;height:32px"></div>
            <div class="skeleton" style="width:40%;height:16px;margin-top:12px"></div>
          </div>
        </div>
      </div>
    } @else if (podcast()) {
      <div class="detail-page container animate-fade-in">
        <div class="hero">
          <img [src]="podcast().imageUrl || '/assets/placeholder.png'" [alt]="podcast().title" class="hero-img" />
          <div class="hero-info">
            <a routerLink="/library" class="back-link">← Biblioteca</a>
            <h1 class="podcast-title">{{ podcast().title }}</h1>
            <p class="podcast-author">{{ podcast().author }}</p>
            <p class="podcast-meta">{{ podcast().episodeCount }} episodios · {{ podcast().category }}</p>
            <div class="hero-actions">
              <button class="btn-refresh" (click)="refreshFeed()" [disabled]="refreshing()">
                {{ refreshing() ? 'Actualizando...' : '↻ Actualizar feed' }}
              </button>
            </div>
          </div>
        </div>

        @if (podcast().description) {
          <p class="description" [class.expanded]="descExpanded()">{{ podcast().description }}</p>
          @if (podcast().description.length > 200) {
            <button class="show-more" (click)="descExpanded.set(!descExpanded())">
              {{ descExpanded() ? 'Ver menos' : 'Ver más' }}
            </button>
          }
        }

        <h2 class="section-title">Episodios</h2>

        <div class="episodes-list">
          @for (episode of episodes(); track episode._id) {
            <div class="episode-item" [class.playing]="player.currentEpisode()?._id === episode._id">
              <!-- Play area -->
              <div class="ep-play" (click)="playEpisode(episode)">
                <div class="ep-play-indicator">
                  @if (player.currentEpisode()?._id === episode._id && player.isPlaying()) {
                    <div class="eq-bars"><span></span><span></span><span></span></div>
                  } @else {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
                  }
                </div>
                <div class="ep-info">
                  <span class="ep-title">{{ episode.title }}</span>
                  <div class="ep-meta">
                    <span>{{ formatDate(episode.publishedAt) }}</span>
                    <span>·</span>
                    <span>{{ episode.duration }}</span>
                  </div>
                </div>
              </div>

              <!-- Add to queue button -->
              <button
                class="btn-queue"
                [class.in-queue]="pl.isInQueue(episode._id)"
                (click)="toggleQueue(episode); $event.stopPropagation()"
                [title]="pl.isInQueue(episode._id) ? 'Quitar de la cola' : 'Añadir a la cola'"
                [attr.aria-label]="pl.isInQueue(episode._id) ? 'Quitar de la cola' : 'Añadir a la cola'"
              >
                @if (pl.isInQueue(episode._id)) {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="18" y1="9" x2="24" y2="9" stroke="none"/>
                    <polyline points="3 6 3 18 5.5 12" fill="currentColor" stroke="none"/>
                    <line x1="19" y1="10" x2="24" y2="10" stroke="none"/>
                  </svg>
                  <span class="btn-queue-label">En cola</span>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <polyline points="3 6 3 18 5.5 12" fill="currentColor" stroke="none"/>
                  </svg>
                  <span class="btn-queue-label">+ Cola</span>
                }
              </button>

              <!-- Download button -->
              <button
                class="btn-download"
                [class.downloaded]="offline.getState(episode._id) === 'downloaded'"
                [class.downloading]="offline.getState(episode._id) === 'downloading'"
                [disabled]="offline.getState(episode._id) === 'downloading'"
                (click)="toggleDownload(episode); $event.stopPropagation()">
                @if (offline.getState(episode._id) === 'downloading') {
                  <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>
                  <span class="dl-pct">{{ offline.downloadProgress()[episode._id] || 0 }}%</span>
                } @else if (offline.getState(episode._id) === 'downloaded') {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                }
              </button>
            </div>
          }
        </div>

        @if (hasMore()) {
          <button class="load-more" (click)="loadMore()">
            {{ loadingMore() ? 'Cargando...' : 'Cargar más episodios' }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    .detail-page { padding-bottom: var(--space-3xl); }
    .hero { display: flex; gap: var(--space-xl); padding: var(--space-xl) 0; align-items: flex-start; }
    .hero-img { width: 200px; height: 200px; border-radius: var(--radius-lg); object-fit: cover; box-shadow: var(--shadow-lg); flex-shrink: 0; }
    .hero-info { flex: 1; }
    .back-link { font-size: var(--font-sm); color: var(--text-muted); display: inline-block; margin-bottom: var(--space-md); }
    .back-link:hover { color: var(--accent); }
    .podcast-title { font-family: var(--font-display); font-size: var(--font-3xl); font-weight: 800; line-height: 1.2; }
    .podcast-author { color: var(--text-secondary); font-size: var(--font-md); margin-top: var(--space-sm); }
    .podcast-meta { color: var(--text-muted); font-size: var(--font-sm); margin-top: var(--space-xs); }
    .hero-actions { margin-top: var(--space-lg); display: flex; gap: var(--space-md); }
    .btn-refresh { padding: var(--space-sm) var(--space-lg); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-full); color: var(--text-secondary); font-size: var(--font-sm); font-weight: 500; min-height: var(--touch-min); transition: all var(--transition-fast); }
    .btn-refresh:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .btn-refresh:disabled { opacity: 0.5; }

    .description { color: var(--text-secondary); font-size: var(--font-sm); line-height: 1.7; max-height: 60px; overflow: hidden; transition: max-height var(--transition-slow); }
    .description.expanded { max-height: 1000px; }
    .show-more { color: var(--accent); font-size: var(--font-sm); font-weight: 500; padding: var(--space-xs) 0; }

    .section-title { font-size: var(--font-xl); font-weight: 700; margin: var(--space-xl) 0 var(--space-md); }

    .episodes-list { display: flex; flex-direction: column; }
    .episode-item { display: flex; align-items: center; gap: var(--space-sm); padding-right: var(--space-sm); border-radius: var(--radius-md); transition: all var(--transition-fast); }
    .episode-item:hover { background: rgba(255,255,255,0.04); }
    .episode-item.playing { background: var(--accent-dim); }
    .episode-item.playing .ep-title { color: var(--accent); }

    .ep-play { display: flex; align-items: center; gap: var(--space-md); flex: 1; min-width: 0; cursor: pointer; padding: var(--space-md); min-height: var(--touch-comfortable); }
    .ep-play-indicator { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; color: var(--text-muted); flex-shrink: 0; }
    .episode-item:hover .ep-play-indicator { color: var(--accent); }

    .ep-info { flex: 1; min-width: 0; }
    .ep-title { font-size: var(--font-md); font-weight: 500; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .ep-meta { display: flex; gap: var(--space-sm); color: var(--text-muted); font-size: var(--font-xs); margin-top: 2px; }

    /* Queue button */
    .btn-queue {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      height: 44px; padding: 0 var(--space-sm); flex-shrink: 0;
      border-radius: var(--radius-full); color: var(--text-muted);
      font-size: var(--font-xs); font-weight: 600;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }
    .btn-queue:hover:not(:disabled) { color: var(--accent-secondary); background: var(--accent-secondary-dim); }
    .btn-queue.in-queue { color: var(--accent-secondary); background: var(--accent-secondary-dim); }
    .btn-queue-label { font-size: 10px; font-weight: 700; }

    /* Download button */
    .btn-download {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      width: 44px; height: 44px; flex-shrink: 0;
      border-radius: var(--radius-full); color: var(--text-muted);
      transition: all var(--transition-fast);
    }
    .btn-download:hover:not(:disabled) { color: var(--accent); background: rgba(255,255,255,0.06); }
    .btn-download.downloaded { color: var(--success); }
    .btn-download.downloading { color: var(--accent); }
    .btn-download .dl-pct { font-size: 9px; font-weight: 700; position: absolute; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Equalizer bars */
    .eq-bars { display: flex; align-items: flex-end; gap: 2px; height: 16px; }
    .eq-bars span { width: 3px; background: var(--accent); border-radius: 2px; animation: eq 0.8s ease infinite alternate; }
    .eq-bars span:nth-child(1) { height: 8px; animation-delay: 0s; }
    .eq-bars span:nth-child(2) { height: 14px; animation-delay: 0.2s; }
    .eq-bars span:nth-child(3) { height: 6px; animation-delay: 0.4s; }
    @keyframes eq { 0% { height: 4px; } 100% { height: 16px; } }

    .load-more { display: block; width: 100%; padding: var(--space-md); text-align: center; color: var(--text-secondary); font-weight: 500; border-radius: var(--radius-md); margin-top: var(--space-md); min-height: var(--touch-min); transition: all var(--transition-fast); }
    .load-more:hover { background: rgba(255,255,255,0.05); color: var(--accent); }
  `,
})
export class PodcastDetailComponent implements OnInit {
  id = input.required<string>();

  podcast = signal<any>(null);
  episodes = signal<any[]>([]);
  loading = signal(true);
  refreshing = signal(false);
  descExpanded = signal(false);
  hasMore = signal(false);
  loadingMore = signal(false);
  currentPage = 1;

  constructor(
    private api: ApiService,
    public player: AudioPlayerService,
    public offline: OfflineStorageService,
    public pl: PlaylistService,
  ) {}

  async ngOnInit() {
    await this.loadPodcast();
  }

  async loadPodcast() {
    this.loading.set(true);
    try {
      const [podRes, epRes] = await Promise.all([
        this.api.getPodcast(this.id()),
        this.api.getEpisodes(this.id(), 1, 50),
      ]);
      this.podcast.set(podRes.data);
      this.episodes.set(epRes.data || []);
      this.hasMore.set((epRes.data?.length || 0) < (epRes.total || 0));
    } catch (e) {
      console.error('Error loading podcast:', e);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore() {
    this.loadingMore.set(true);
    this.currentPage++;
    try {
      const res = await this.api.getEpisodes(this.id(), this.currentPage, 50);
      this.episodes.update(eps => [...eps, ...(res.data || [])]);
      this.hasMore.set(this.episodes().length < (res.total || 0));
    } finally {
      this.loadingMore.set(false);
    }
  }

  async refreshFeed() {
    this.refreshing.set(true);
    try {
      await this.api.refreshPodcast(this.id());
      await this.loadPodcast();
    } finally {
      this.refreshing.set(false);
    }
  }

  playEpisode(episode: any) {
    const ep: PlayerEpisode = {
      _id: episode._id, title: episode.title, audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl, duration: episode.duration,
      durationSeconds: episode.durationSeconds, podcastId: this.podcast()?._id,
      podcastTitle: this.podcast()?.title, podcastImageUrl: this.podcast()?.imageUrl,
    };
    this.player.play(ep);
  }

  toggleQueue(episode: any): void {
    const ep: PlayerEpisode = {
      _id: episode._id, title: episode.title, audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl, duration: episode.duration,
      durationSeconds: episode.durationSeconds, podcastId: this.podcast()?._id,
      podcastTitle: this.podcast()?.title, podcastImageUrl: this.podcast()?.imageUrl,
    };
    if (this.pl.isInQueue(episode._id)) {
      this.pl.remove(episode._id);
    } else {
      this.pl.addToQueue(ep);
    }
  }

  toggleDownload(episode: any) {
    const state = this.offline.getState(episode._id);
    if (state === 'downloaded') {
      this.offline.remove(episode._id);
    } else if (state === 'none') {
      this.offline.download({
        _id: episode._id, title: episode.title, audioUrl: episode.audioUrl,
        imageUrl: episode.imageUrl, duration: episode.duration,
        podcastId: this.podcast()?._id, podcastTitle: this.podcast()?.title,
        podcastImageUrl: this.podcast()?.imageUrl,
      });
    }
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
