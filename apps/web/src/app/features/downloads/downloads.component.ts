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
          <p class="page-subtitle">
            {{ offline.downloads().length }} episodios
            @if (offline.localDownloads().length > 0) {
              · {{ offline.formatSize(offline.totalSize()) }} en caché local
            }
          </p>
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

        <!-- Locally cached episodes -->
        @if (offline.localDownloads().length > 0) {
          @if (offline.serverDownloads().length > 0) {
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Descargados localmente</span>
            </div>
          }
          <div class="list">
            @for (ep of offline.localDownloads(); track ep._id) {
              <div class="item" (click)="play(ep)">
                <img [src]="ep.podcastImageUrl || ep.imageUrl || ''" class="thumb" />
                <div class="info">
                  <span class="title">{{ ep.title }}</span>
                  <div class="meta">
                    <span>{{ ep.podcastTitle || 'Podcast' }}</span>
                    <span>·</span>
                    @if (ep.publishedAt) {
                      <span>{{ formatDate(ep.publishedAt) }}</span>
                      <span>·</span>
                    }
                    <span>{{ offline.formatSize(ep.sizeBytes) }}</span>
                  </div>
                </div>
                <div class="badges">
                  <span class="badge badge-local" title="Disponible sin conexión">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M1 6l11 13L23 6z"/></svg>
                  </span>
                </div>
                <button class="btn-remove" (click)="remove(ep._id); $event.stopPropagation()" title="Eliminar descarga">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            }
          </div>
        }

        <!-- Server-only episodes (available but not yet cached in browser) -->
        @if (offline.serverDownloads().length > 0) {
          @if (offline.localDownloads().length > 0) {
            <div class="section-divider"></div>
          }
          <div class="section-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            <span>En servidor</span>
            <span class="section-hint">Sincronizando al dispositivo...</span>
          </div>
          <div class="list">
            @for (ep of offline.serverDownloads(); track ep._id) {
              <div class="item item-server" (click)="play(ep)">
                <img [src]="ep.podcastImageUrl || ep.imageUrl || ''" class="thumb" />
                <div class="info">
                  <span class="title">{{ ep.title }}</span>
                  <div class="meta">
                    <span>{{ ep.podcastTitle || 'Podcast' }}</span>
                    <span>·</span>
                    @if (ep.publishedAt) {
                      <span>{{ formatDate(ep.publishedAt) }}</span>
                      <span>·</span>
                    }
                    <span class="syncing-label">
                      <span class="syncing-dot"></span>
                      Disponible en servidor
                    </span>
                  </div>
                </div>
                <button class="btn-remove" (click)="remove(ep._id); $event.stopPropagation()" title="Eliminar de la lista">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            }
          </div>
        }
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

    .section-header { display: flex; align-items: center; gap: var(--space-sm); font-size: var(--font-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; padding: var(--space-md) 0 var(--space-sm); }
    .section-hint { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-muted); opacity: 0.6; }
    .section-divider { margin: var(--space-lg) 0; border-top: 1px solid rgba(255,255,255,0.06); }

    .list { display: flex; flex-direction: column; gap: 4px; }
    .item { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md); border-radius: var(--radius-md); cursor: pointer; min-height: var(--touch-comfortable); transition: background var(--transition-fast); }
    .item:hover { background: rgba(255,255,255,0.04); }
    .item-server { opacity: 0.75; }
    .thumb { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { display: flex; gap: var(--space-sm); font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px; align-items: center; flex-wrap: wrap; }
    .badges { display: flex; gap: 4px; flex-shrink: 0; }
    .badge { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: var(--radius-full); }
    .badge-local { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .btn-remove { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-full); color: var(--text-muted); flex-shrink: 0; transition: all var(--transition-fast); }
    .btn-remove:hover { color: var(--error); background: rgba(239,68,68,0.1); }

    .syncing-label { display: inline-flex; align-items: center; gap: 4px; color: var(--accent); }
    .syncing-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

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

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
