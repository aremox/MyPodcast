import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AudioPlayerService, PlayerEpisode } from '../../core/services/audio-player.service';

@Component({
  selector: 'app-history',
  template: `
    <div class="page container animate-fade-in">
      <h1 class="page-title">Historial</h1>
      @if (loading()) {
        <div class="list">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton" style="height:60px;margin-bottom:8px"></div>
          }
        </div>
      } @else if (history().length === 0) {
        <div class="empty"><span>🕐</span><p>Sin historial</p></div>
      } @else {
        <div class="list">
          @for (entry of history(); track entry._id) {
            <div class="item" (click)="play(entry)">
              <img [src]="entry.podcastId?.imageUrl || entry.episodeId?.imageUrl || ''" class="thumb" [alt]="entry.podcastId?.title" />
              <div class="info">
                <span class="title">{{ entry.episodeId?.title }}</span>
                <span class="sub">
                  {{ entry.podcastId?.title }}
                  @if (entry.episodeId?.publishedAt) {
                    · {{ formatDate(entry.episodeId?.publishedAt) }}
                  }
                </span>
              </div>
              @if (entry.completed) { <span class="done">✓</span> }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding: var(--space-xl) var(--space-lg); }
    .page-title { font-family: var(--font-display); font-size: var(--font-3xl); font-weight: 800; margin-bottom: var(--space-lg); }
    .list { display: flex; flex-direction: column; gap: 4px; }
    .item { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md); border-radius: var(--radius-md); cursor: pointer; min-height: var(--touch-comfortable); transition: background var(--transition-fast); }
    .item:hover { background: rgba(255,255,255,0.04); }
    .thumb { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { font-size: var(--font-xs); color: var(--text-muted); display: flex; gap: 4px; align-items: center; }
    .done { color: var(--success); font-weight: 700; }
    .empty { text-align: center; padding: var(--space-3xl); color: var(--text-muted); }
    .empty span { font-size: 3rem; display: block; margin-bottom: var(--space-md); }
  `,
})
export class HistoryComponent implements OnInit {
  history = signal<any[]>([]);
  loading = signal(true);
  constructor(private api: ApiService, private player: AudioPlayerService) {}
  async ngOnInit() {
    try { const r = await this.api.getHistory(); this.history.set(r.data || []); } finally { this.loading.set(false); }
  }
  play(entry: any) {
    const ep = entry.episodeId;
    if (!ep) return;
    const podcast = entry.podcastId;
    this.player.play({ _id: ep._id, title: ep.title, audioUrl: ep.audioUrl, podcastId: podcast?._id, podcastTitle: podcast?.title, podcastImageUrl: podcast?.imageUrl });
  }

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
