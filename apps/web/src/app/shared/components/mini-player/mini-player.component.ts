import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AudioPlayerService } from '../../../core/services/audio-player.service';
import { PlaylistService } from '../../../core/services/playlist.service';

@Component({
  selector: 'app-mini-player',
  imports: [RouterLink],
  template: `
    @if (player.currentEpisode(); as episode) {
      <div class="mini-player">
        <div class="progress-bar" (click)="onProgressClick($event)" title="Haz clic para saltar">
          <div class="progress-fill" [style.width.%]="player.progress()"></div>
          <div class="progress-buffered" [style.width.%]="bufferedPercent()"></div>
        </div>
        <div class="player-content">
          <!-- Episode info — click to go to playlist -->
          <a routerLink="/playlist" class="episode-info">
            <img
              [src]="episode.podcastImageUrl || episode.imageUrl || '/assets/placeholder.png'"
              [alt]="episode.title"
              class="episode-art"
            />
            <div class="episode-text">
              <span class="episode-title">{{ episode.title }}</span>
              <span class="podcast-title">{{ episode.podcastTitle }}</span>
            </div>
          </a>

          <!-- Controls -->
          <div class="player-controls">
            <!-- Prev (only if playlist has prev) -->
            @if (pl.hasPrev()) {
              <button class="ctrl-btn ctrl-nav" (click)="player.playPrev()" aria-label="Episodio anterior" title="Anterior">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="19 20 9 12 19 4"/><rect x="5" y="4" width="2" height="16" rx="1"/>
                </svg>
              </button>
            }

            <button class="ctrl-btn" (click)="player.seekRelative(-15)" aria-label="Retroceder 15s" title="-15s">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                <text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="7" font-weight="bold">15</text>
              </svg>
            </button>

            <button class="ctrl-btn play-btn" (click)="player.togglePlay()" [attr.aria-label]="player.isPlaying() ? 'Pausar' : 'Reproducir'">
              @if (player.isLoading()) {
                <div class="spinner"></div>
              } @else if (player.isPlaying()) {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              } @else {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>

            <button class="ctrl-btn" (click)="player.seekRelative(30)" aria-label="Avanzar 30s" title="+30s">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                <text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="7" font-weight="bold">30</text>
              </svg>
            </button>

            <!-- Next (only if playlist has next) -->
            @if (pl.hasNext()) {
              <button class="ctrl-btn ctrl-nav" (click)="player.playNext()" aria-label="Siguiente episodio" title="Siguiente">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 4 15 12 5 20"/><rect x="17" y="4" width="2" height="16" rx="1"/>
                </svg>
              </button>
            }
          </div>

          <!-- Time + queue info -->
          <div class="right-info">
            <span class="time-display">{{ player.formattedCurrentTime() }} / {{ player.formattedDuration() }}</span>
            @if (pl.count() > 0) {
              <a routerLink="/playlist" class="queue-info" title="Ver cola">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <polygon points="3 6 3 18 5.5 12" fill="currentColor" stroke="none"/>
                </svg>
                {{ pl.currentIndex() + 1 }}/{{ pl.count() }}
              </a>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .mini-player {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: var(--z-mini-player);
      background: var(--bg-elevated);
      border-top: 1px solid rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
    }

    /* Clickable progress bar */
    .progress-bar {
      height: 4px;
      background: rgba(255,255,255,0.08);
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .progress-bar:hover { height: 6px; }
    .progress-fill {
      height: 100%;
      background: var(--accent-gradient);
      transition: width 250ms linear;
      position: absolute; top: 0; left: 0;
      z-index: 2;
    }
    .progress-buffered {
      height: 100%;
      background: rgba(255,255,255,0.15);
      position: absolute; top: 0; left: 0;
      z-index: 1;
      transition: width 500ms ease;
    }

    .player-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-sm) var(--space-lg);
      height: 72px;
      gap: var(--space-md);
    }

    /* Episode info */
    .episode-info {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      flex: 1;
      min-width: 0;
      text-decoration: none;
      color: inherit;
    }
    .episode-info:hover .episode-title { color: var(--accent); }
    .episode-art {
      width: 48px; height: 48px;
      border-radius: var(--radius-sm);
      object-fit: cover; flex-shrink: 0;
      transition: transform var(--transition-fast);
    }
    .episode-info:hover .episode-art { transform: scale(1.05); }
    .episode-text { display: flex; flex-direction: column; min-width: 0; }
    .episode-title {
      font-size: var(--font-sm); font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 300px;
      transition: color var(--transition-fast);
    }
    .podcast-title { font-size: var(--font-xs); color: var(--text-muted); }

    /* Controls */
    .player-controls {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-shrink: 0;
    }
    .ctrl-btn {
      display: flex; align-items: center; justify-content: center;
      min-width: var(--touch-min); min-height: var(--touch-min);
      border-radius: var(--radius-full);
      color: var(--text-primary);
      transition: all var(--transition-fast);
    }
    .ctrl-btn:hover { background: rgba(255,255,255,0.1); }
    .ctrl-nav { color: var(--text-secondary); }
    .ctrl-nav:hover { color: var(--accent); background: var(--accent-dim); }
    .play-btn {
      width: 48px; height: 48px;
      background: var(--accent); color: var(--bg-primary);
    }
    .play-btn:hover { background: var(--accent-hover); transform: scale(1.05); }

    /* Right info */
    .right-info {
      display: flex; flex-direction: column; align-items: flex-end;
      gap: 4px; flex-shrink: 0;
    }
    .time-display { font-size: var(--font-xs); color: var(--text-muted); white-space: nowrap; }
    .queue-info {
      display: flex; align-items: center; gap: 4px;
      font-size: 10px; color: var(--text-muted);
      text-decoration: none;
      transition: color var(--transition-fast);
    }
    .queue-info:hover { color: var(--accent); }

    /* Spinner */
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid rgba(0,0,0,0.3);
      border-top-color: var(--bg-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class MiniPlayerComponent {
  constructor(
    public player: AudioPlayerService,
    public pl: PlaylistService,
    private router: Router,
  ) {}

  bufferedPercent(): number {
    const d = this.player.duration();
    return d > 0 ? (this.player.buffered() / d) * 100 : 0;
  }

  onProgressClick(event: MouseEvent): void {
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const pct = (event.clientX - rect.left) / rect.width;
    this.player.seekToPercent(pct * 100);
  }
}
