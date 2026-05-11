import { Component } from '@angular/core';
import { OfflineStorageService, DownloadedEpisode } from '../../core/services/offline-storage.service';
import { AudioPlayerService } from '../../core/services/audio-player.service';

@Component({
  selector: 'app-downloads',
  template: `
    <div class="page container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Descargas</h1>
          <p class="page-subtitle">{{ offline.downloads().length }} episodios · {{ offline.formatSize(offline.totalSize()) }}</p>
        </div>
        @if (offline.downloads().length > 0) {
          <button class="btn-clear" (click)="clearAll()">Borrar todo</button>
        }
      </div>

      @if (offline.downloads().length === 0) {
        <div class="empty">
          <span>📥</span>
          <p>Sin descargas</p>
          <p class="hint">Descarga episodios desde la vista de podcast para escucharlos sin conexión</p>
        </div>
      } @else {
        <div class="list">
          @for (ep of offline.downloads(); track ep._id) {
            <div class="item" (click)="play(ep)">
              <img [src]="ep.podcastImageUrl || ''" class="thumb" />
              <div class="info">
                <span class="title">{{ ep.title }}</span>
                <div class="meta">
                  <span>{{ ep.podcastTitle }}</span>
                  <span>·</span>
                  <span>{{ offline.formatSize(ep.sizeBytes) }}</span>
                </div>
              </div>
              <button class="btn-remove" (click)="remove(ep._id); $event.stopPropagation()" title="Eliminar descarga">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding: var(--space-xl) var(--space-lg); padding-bottom: var(--space-3xl); }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--space-lg); }
    .page-title { font-family: var(--font-display); font-size: var(--font-3xl); font-weight: 800; }
    .page-subtitle { color: var(--text-muted); font-size: var(--font-sm); margin-top: var(--space-xs); }
    .btn-clear { padding: var(--space-sm) var(--space-lg); background: rgba(239,68,68,0.1); color: var(--error); border-radius: var(--radius-full); font-size: var(--font-sm); font-weight: 500; min-height: var(--touch-min); transition: all var(--transition-fast); }
    .btn-clear:hover { background: rgba(239,68,68,0.2); }

    .list { display: flex; flex-direction: column; gap: 4px; }
    .item { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md); border-radius: var(--radius-md); cursor: pointer; min-height: var(--touch-comfortable); transition: background var(--transition-fast); }
    .item:hover { background: rgba(255,255,255,0.04); }
    .thumb { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { display: flex; gap: var(--space-sm); font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px; }
    .btn-remove { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-full); color: var(--text-muted); flex-shrink: 0; transition: all var(--transition-fast); }
    .btn-remove:hover { color: var(--error); background: rgba(239,68,68,0.1); }

    .empty { text-align: center; padding: var(--space-3xl); color: var(--text-muted); }
    .empty span { font-size: 3rem; display: block; margin-bottom: var(--space-md); }
    .hint { font-size: var(--font-sm); margin-top: var(--space-sm); }
  `,
})
export class DownloadsComponent {
  constructor(public offline: OfflineStorageService, private player: AudioPlayerService) {}

  play(ep: DownloadedEpisode) {
    this.player.play({
      _id: ep._id, title: ep.title, audioUrl: ep.audioUrl,
      podcastId: ep.podcastId, podcastTitle: ep.podcastTitle,
      podcastImageUrl: ep.podcastImageUrl,
    });
  }

  remove(id: string) {
    this.offline.remove(id);
  }

  clearAll() {
    this.offline.clearAll();
  }
}
