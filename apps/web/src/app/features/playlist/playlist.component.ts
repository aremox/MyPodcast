import { Component, signal } from '@angular/core';
import { PlaylistService } from '../../core/services/playlist.service';
import { AudioPlayerService, PlayerEpisode } from '../../core/services/audio-player.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-playlist',
  template: `
    <div class="playlist-page container animate-fade-in">
      <div class="page-header">
        <div class="header-left">
          <h1>🎶 Cola de reproducción</h1>
          <span class="count-badge" *ngIf="pl.count() > 0">{{ pl.count() }} episodios</span>
        </div>
        @if (!pl.isEmpty()) {
          <div class="header-actions">
            @if (exportService.isSupported()) {
              <button class="btn-action btn-export" (click)="exportService.exportQueueToUsb(pl.queue())" title="Exportar a USB">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span class="btn-text">Exportar USB</span>
              </button>
            }
            <button class="btn-action btn-play-all" (click)="playAll()" title="Reproducir todo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
              <span class="btn-text">Reproducir todo</span>
            </button>
            <button class="btn-action btn-clear" (click)="clearConfirm()" title="Vaciar cola">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              <span class="btn-text">Vaciar</span>
            </button>
          </div>
        }
      </div>

      @if (pl.isEmpty()) {
        <!-- Empty state -->
        <div class="empty-state">
          <div class="empty-icon">🎧</div>
          <h2>Tu cola está vacía</h2>
          <p>Añade episodios a la cola desde cualquier podcast usando el botón <strong>+ Cola</strong>.</p>
          <div class="empty-hint">
            <div class="hint-step">
              <span class="step-num">1</span>
              <span>Abre un podcast</span>
            </div>
            <div class="hint-arrow">→</div>
            <div class="hint-step">
              <span class="step-num">2</span>
              <span>Pulsa <strong>+ Cola</strong> en un episodio</span>
            </div>
            <div class="hint-arrow">→</div>
            <div class="hint-step">
              <span class="step-num">3</span>
              <span>¡Aquí aparecerá!</span>
            </div>
          </div>
        </div>
      } @else {
        <!-- Drag hint -->
        <p class="drag-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
          Arrastra los episodios para cambiar el orden de reproducción
        </p>

        <!-- Queue list -->
        <div class="queue-list">
          @for (episode of pl.queue(); track episode._id; let i = $index) {
            <div
              class="queue-item"
              [class.is-playing]="player.currentEpisode()?._id === episode._id"
              [class.drag-over]="dragOverIndex() === i"
              [class.dragging]="draggingIndex() === i"
              draggable="true"
              (dragstart)="onDragStart($event, i)"
              (dragover)="onDragOver($event, i)"
              (dragleave)="onDragLeave()"
              (drop)="onDrop($event, i)"
              (dragend)="onDragEnd()"
            >
              <!-- Drag handle -->
              <div class="drag-handle" title="Arrastra para reordenar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>

              <!-- Position number / playing indicator -->
              <div class="position">
                @if (player.currentEpisode()?._id === episode._id && player.isPlaying()) {
                  <div class="eq-bars"><span></span><span></span><span></span></div>
                } @else {
                  <span class="pos-num">{{ i + 1 }}</span>
                }
              </div>

              <!-- Artwork -->
              <img
                [src]="episode.podcastImageUrl || episode.imageUrl || '/assets/placeholder.png'"
                [alt]="episode.podcastTitle"
                class="ep-art"
              />

              <!-- Episode info -->
              <div class="ep-info" (click)="playEpisode(episode)">
                <span class="ep-title">{{ episode.title }}</span>
                <span class="ep-podcast">{{ episode.podcastTitle }}</span>
                @if (episode.duration) {
                  <span class="ep-duration">{{ episode.duration }}</span>
                }
              </div>

              <!-- Play button -->
              <button
                class="btn-play-ep"
                (click)="playEpisode(episode)"
                [attr.aria-label]="player.currentEpisode()?._id === episode._id && player.isPlaying() ? 'Pausar' : 'Reproducir'"
                title="Reproducir"
              >
                @if (player.currentEpisode()?._id === episode._id && player.isPlaying()) {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
                }
              </button>

              <!-- Remove from queue -->
              <button
                class="btn-remove"
                (click)="pl.remove(episode._id)"
                title="Quitar de la cola"
                aria-label="Quitar de la cola"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- Drop zone indicator -->
            @if (dragOverIndex() === i) {
              <div class="drop-indicator"></div>
            }
          }
        </div>
      }
    </div>

    <!-- Confirm clear modal -->
    @if (showConfirm()) {
      <div class="modal-backdrop" (click)="showConfirm.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>¿Vaciar la cola?</h3>
          <p>Se eliminarán todos los {{ pl.count() }} episodios de la cola.</p>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="showConfirm.set(false)">Cancelar</button>
            <button class="btn-confirm" (click)="clearQueue()">Vaciar</button>
          </div>
        </div>
      </div>
    }

    <!-- Export Progress Overlay -->
    @if (exportService.isExporting() || exportService.exportError()) {
      <div class="modal-backdrop">
        <div class="modal" (click)="$event.stopPropagation()">
          @if (exportService.exportError()) {
            <h3 class="error-title">Error al exportar</h3>
            <p>{{ exportService.exportError() }}</p>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="exportService.exportError.set(null)">Cerrar</button>
            </div>
          } @else {
            <h3>Exportando a USB...</h3>
            <p class="export-status">Copiando episodio {{ exportService.currentExported() + 1 }} de {{ exportService.totalToExport() }}</p>
            <p class="export-filename">{{ exportService.currentEpisodeName() }}</p>
            
            <div class="progress-container">
              <div class="progress-bar" [style.width.%]="(exportService.currentExported() / exportService.totalToExport()) * 100"></div>
            </div>
            
            <p class="export-warning">⚠️ Por favor no cierres esta pestaña ni desconectes el USB.</p>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .playlist-page { padding-bottom: var(--space-3xl); padding-top: var(--space-xl); }

    /* ── Header ── */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: var(--space-lg); flex-wrap: wrap; gap: var(--space-md);
    }
    .header-left { display: flex; align-items: center; gap: var(--space-md); }
    .page-header h1 { font-family: var(--font-display); font-size: var(--font-3xl); font-weight: 800; }
    .count-badge {
      background: var(--accent-dim); color: var(--accent);
      padding: 4px 12px; border-radius: var(--radius-full);
      font-size: var(--font-sm); font-weight: 600;
    }
    .header-actions { display: flex; gap: var(--space-sm); }
    .btn-action {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius-full); font-size: var(--font-sm); font-weight: 500;
      min-height: var(--touch-min); transition: all var(--transition-fast);
    }
    .btn-play-all {
      background: var(--accent); color: var(--bg-primary);
    }
    .btn-play-all:hover { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,212,170,0.3); }
    .btn-clear {
      background: rgba(255,255,255,0.06); color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-clear:hover { background: rgba(239,68,68,0.1); color: var(--error); border-color: rgba(239,68,68,0.2); }

    /* ── Drag hint ── */
    .drag-hint {
      display: flex; align-items: center; gap: var(--space-sm);
      color: var(--text-muted); font-size: var(--font-xs);
      margin-bottom: var(--space-md);
    }

    /* ── Queue list ── */
    .queue-list { display: flex; flex-direction: column; gap: 4px; }

    .queue-item {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: var(--space-sm) var(--space-sm);
      border-radius: var(--radius-md);
      background: var(--bg-card);
      border: 1px solid transparent;
      transition: all var(--transition-fast);
      cursor: default;
      position: relative;
      user-select: none;
    }
    .queue-item:hover { background: var(--bg-card-hover); border-color: rgba(255,255,255,0.06); }
    .queue-item.is-playing { background: var(--accent-dim); border-color: rgba(0,212,170,0.2); }
    .queue-item.dragging { opacity: 0.4; transform: scale(0.98); }
    .queue-item.drag-over { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-dim); }

    /* ── Drag handle ── */
    .drag-handle {
      color: var(--text-muted); cursor: grab; padding: var(--space-sm);
      border-radius: var(--radius-sm); flex-shrink: 0;
      transition: color var(--transition-fast);
      display: flex; align-items: center; justify-content: center;
    }
    .drag-handle:hover { color: var(--accent); }
    .drag-handle:active { cursor: grabbing; }

    /* ── Position ── */
    .position {
      width: 28px; text-align: center; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .pos-num { color: var(--text-muted); font-size: var(--font-sm); font-weight: 600; }
    .is-playing .pos-num { color: var(--accent); }

    /* Equalizer bars */
    .eq-bars { display: flex; align-items: flex-end; gap: 2px; height: 14px; }
    .eq-bars span { width: 3px; background: var(--accent); border-radius: 2px; animation: eq 0.8s ease infinite alternate; }
    .eq-bars span:nth-child(1) { height: 6px; animation-delay: 0s; }
    .eq-bars span:nth-child(2) { height: 12px; animation-delay: 0.2s; }
    .eq-bars span:nth-child(3) { height: 4px; animation-delay: 0.4s; }
    @keyframes eq { 0% { height: 4px; } 100% { height: 14px; } }

    /* ── Artwork ── */
    .ep-art { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }

    /* ── Episode info ── */
    .ep-info { flex: 1; min-width: 0; cursor: pointer; padding: var(--space-xs) 0; }
    .ep-title {
      display: block; font-size: var(--font-sm); font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .is-playing .ep-title { color: var(--accent); }
    .ep-podcast { display: block; font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px; }
    .ep-duration { display: inline-block; font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px; }

    /* ── Action buttons ── */
    .btn-play-ep, .btn-remove {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: var(--radius-full);
      flex-shrink: 0; transition: all var(--transition-fast);
    }
    .btn-play-ep { color: var(--text-secondary); }
    .btn-play-ep:hover { color: var(--accent); background: var(--accent-dim); }
    .btn-remove { color: var(--text-muted); }
    .btn-remove:hover { color: var(--error); background: rgba(239,68,68,0.1); }

    /* ── Drop indicator ── */
    .drop-indicator {
      height: 2px; background: var(--accent);
      border-radius: var(--radius-full);
      margin: 0 var(--space-md);
      box-shadow: 0 0 8px rgba(0,212,170,0.5);
    }

    /* ── Empty state ── */
    .empty-state {
      text-align: center; padding: var(--space-3xl) var(--space-lg);
      animation: fadeInUp 0.4s ease both;
    }
    .empty-icon { font-size: 4rem; margin-bottom: var(--space-lg); }
    .empty-state h2 { font-size: var(--font-2xl); font-weight: 700; margin-bottom: var(--space-md); }
    .empty-state p { color: var(--text-secondary); max-width: 400px; margin: 0 auto var(--space-2xl); line-height: 1.7; }

    .empty-hint {
      display: flex; align-items: center; justify-content: center;
      gap: var(--space-md); flex-wrap: wrap;
    }
    .hint-step {
      display: flex; align-items: center; gap: var(--space-sm);
      background: var(--bg-card); border-radius: var(--radius-md);
      padding: var(--space-sm) var(--space-md); font-size: var(--font-sm);
    }
    .step-num {
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--accent-dim); color: var(--accent);
      font-size: var(--font-xs); font-weight: 700;
    }
    .hint-arrow { color: var(--text-muted); font-size: var(--font-lg); }

    /* ── Confirm modal ── */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      z-index: var(--z-modal); display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px); animation: fadeIn 0.2s ease;
    }
    .modal {
      background: var(--bg-elevated); border-radius: var(--radius-xl);
      padding: var(--space-xl); max-width: 380px; width: 90%;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: var(--shadow-lg);
      animation: fadeInUp 0.2s ease;
    }
    .modal h3 { font-size: var(--font-xl); font-weight: 700; margin-bottom: var(--space-sm); }
    .modal p { color: var(--text-secondary); font-size: var(--font-sm); margin-bottom: var(--space-xl); }
    .modal-actions { display: flex; gap: var(--space-md); justify-content: flex-end; }
    .btn-cancel {
      padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-full);
      background: rgba(255,255,255,0.06); color: var(--text-secondary);
      font-weight: 500; min-height: var(--touch-min);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-cancel:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .btn-confirm {
      padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-full);
      background: var(--error); color: #fff; font-weight: 600;
      min-height: var(--touch-min);
    }
    .btn-confirm:hover { background: #dc2626; transform: translateY(-1px); }

    /* ── Export ── */
    .btn-export {
      background: rgba(255,255,255,0.06); color: var(--text-primary);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-export:hover { background: rgba(255,255,255,0.1); }
    
    .export-status { font-weight: 600; color: var(--accent); margin-bottom: 4px !important; }
    .export-filename { font-size: var(--font-xs); color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: var(--space-md) !important; }
    .progress-container { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: var(--radius-full); overflow: hidden; margin-bottom: var(--space-md); }
    .progress-bar { height: 100%; background: var(--accent); border-radius: var(--radius-full); transition: width 0.3s ease; }
    .export-warning { font-size: var(--font-xs); color: var(--warning); margin-top: var(--space-md) !important; }
    .error-title { color: var(--error); }
    
    @media (max-width: 600px) {
      .btn-text { display: none; }
      .btn-action { padding: var(--space-sm); }
    }
  `,
})
export class PlaylistComponent {
  draggingIndex = signal<number>(-1);
  dragOverIndex = signal<number>(-1);
  showConfirm = signal(false);

  constructor(
    public pl: PlaylistService,
    public player: AudioPlayerService,
    public exportService: ExportService,
  ) {}

  playEpisode(episode: PlayerEpisode): void {
    if (this.player.currentEpisode()?._id === episode._id) {
      this.player.togglePlay();
    } else {
      this.pl.setCurrentById(episode._id);
      this.player.play(episode);
    }
  }

  playAll(): void {
    const queue = this.pl.queue();
    if (queue.length === 0) return;
    this.pl.currentIndex.set(0);
    this.player.play(queue[0]);
  }

  clearConfirm(): void {
    this.showConfirm.set(true);
  }

  clearQueue(): void {
    this.pl.clear();
    this.showConfirm.set(false);
  }

  // ── Drag & Drop (native HTML5) ─────────────────────────────────────────

  onDragStart(event: DragEvent, index: number): void {
    this.draggingIndex.set(index);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(index));
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    if (this.dragOverIndex() !== index) {
      this.dragOverIndex.set(index);
    }
  }

  onDragLeave(): void {
    // Only clear on actual leave (not child elements)
    // Handled via dragend to avoid flicker
  }

  onDrop(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    const fromIndex = this.draggingIndex();
    if (fromIndex !== -1 && fromIndex !== toIndex) {
      this.pl.reorder(fromIndex, toIndex);
    }
    this.draggingIndex.set(-1);
    this.dragOverIndex.set(-1);
  }

  onDragEnd(): void {
    this.draggingIndex.set(-1);
    this.dragOverIndex.set(-1);
  }
}
