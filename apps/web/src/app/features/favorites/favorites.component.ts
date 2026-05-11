import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AudioPlayerService, PlayerEpisode } from '../../core/services/audio-player.service';

@Component({
  selector: 'app-favorites',
  template: `
    <div class="page container animate-fade-in">
      <h1 class="page-title">Favoritos</h1>

      @if (loading()) {
        <div class="list">
          @for (i of [1,2,3,4]; track i) {
            <div class="item"><div class="skeleton" style="width:100%;height:60px"></div></div>
          }
        </div>
      } @else if (favorites().length === 0) {
        <div class="empty">
          <span>❤️</span>
          <p>Aún no tienes favoritos</p>
        </div>
      } @else {
        <div class="list">
          @for (fav of favorites(); track fav._id) {
            <div class="item" (click)="play(fav)">
              <img [src]="fav.episodeId?.podcastId?.imageUrl || ''" class="thumb" />
              <div class="info">
                <span class="title">{{ fav.episodeId?.title }}</span>
                <span class="sub">{{ fav.episodeId?.podcastId?.title }}</span>
              </div>
              <button class="btn-remove" (click)="remove(fav.episodeId?._id); $event.stopPropagation()">✕</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding: var(--space-xl) var(--space-lg); }
    .page-title { font-family: var(--font-display); font-size: var(--font-3xl); font-weight: 800; margin-bottom: var(--space-lg); }
    .list { display: flex; flex-direction: column; gap: var(--space-xs); }
    .item {
      display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md);
      border-radius: var(--radius-md); cursor: pointer; transition: background var(--transition-fast);
      min-height: var(--touch-comfortable);
    }
    .item:hover { background: rgba(255,255,255,0.04); }
    .thumb { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .title { font-weight: 500; font-size: var(--font-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { font-size: var(--font-xs); color: var(--text-muted); }
    .btn-remove { color: var(--text-muted); font-size: var(--font-lg); min-width: var(--touch-min); min-height: var(--touch-min); display: flex; align-items: center; justify-content: center; border-radius: var(--radius-full); }
    .btn-remove:hover { color: var(--error); background: rgba(239,68,68,0.1); }
    .empty { text-align: center; padding: var(--space-3xl); color: var(--text-muted); }
    .empty span { font-size: 3rem; display: block; margin-bottom: var(--space-md); }
  `,
})
export class FavoritesComponent implements OnInit {
  favorites = signal<any[]>([]);
  loading = signal(true);

  constructor(private api: ApiService, private player: AudioPlayerService) {}

  async ngOnInit() {
    this.loading.set(true);
    try {
      const res = await this.api.getFavorites();
      this.favorites.set(res.data || []);
    } finally { this.loading.set(false); }
  }

  play(fav: any) {
    const ep = fav.episodeId;
    if (!ep) return;
    const playerEp: PlayerEpisode = {
      _id: ep._id, title: ep.title, audioUrl: ep.audioUrl,
      podcastId: ep.podcastId?._id, podcastTitle: ep.podcastId?.title,
      podcastImageUrl: ep.podcastId?.imageUrl,
    };
    this.player.play(playerEp);
  }

  async remove(episodeId: string) {
    if (!episodeId) return;
    await this.api.removeFavorite(episodeId);
    this.favorites.update(fs => fs.filter(f => f.episodeId?._id !== episodeId));
  }
}
