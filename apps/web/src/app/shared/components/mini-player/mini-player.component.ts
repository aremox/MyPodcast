import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AudioPlayerService } from '../../../core/services/audio-player.service';

@Component({
  selector: 'app-mini-player',
  template: `
    @if (player.currentEpisode(); as episode) {
      <div class="mini-player" (click)="goToPlayer()">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="player.progress()"></div>
        </div>
        <div class="player-content">
          <div class="episode-info">
            <img
              [src]="episode.podcastImageUrl || episode.imageUrl || '/assets/placeholder.png'"
              [alt]="episode.title"
              class="episode-art"
            />
            <div class="episode-text">
              <span class="episode-title">{{ episode.title }}</span>
              <span class="podcast-title">{{ episode.podcastTitle }}</span>
            </div>
          </div>
          <div class="player-controls" (click)="$event.stopPropagation()">
            <button class="ctrl-btn" (click)="player.seekRelative(-15)" aria-label="Retroceder 15s">
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
            <button class="ctrl-btn" (click)="player.seekRelative(30)" aria-label="Avanzar 30s">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                <text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="7" font-weight="bold">30</text>
              </svg>
            </button>
          </div>
          <div class="time-info">
            <span>{{ player.formattedCurrentTime() }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .mini-player {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: var(--z-mini-player);
      background: var(--bg-elevated);
      border-top: 1px solid rgba(255,255,255,0.06);
      cursor: pointer;
      backdrop-filter: blur(20px);
    }
    .progress-bar {
      height: 3px;
      background: rgba(255,255,255,0.08);
    }
    .progress-fill {
      height: 100%;
      background: var(--accent-gradient);
      transition: width 250ms linear;
    }
    .player-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-sm) var(--space-lg);
      height: 72px;
    }
    .episode-info {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      flex: 1;
      min-width: 0;
    }
    .episode-art {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-sm);
      object-fit: cover;
      flex-shrink: 0;
    }
    .episode-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .episode-title {
      font-size: var(--font-sm);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 300px;
    }
    .podcast-title {
      font-size: var(--font-xs);
      color: var(--text-muted);
    }
    .player-controls {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }
    .ctrl-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: var(--touch-min);
      min-height: var(--touch-min);
      border-radius: var(--radius-full);
      color: var(--text-primary);
      transition: all var(--transition-fast);
    }
    .ctrl-btn:hover { background: rgba(255,255,255,0.1); }
    .play-btn {
      width: 48px;
      height: 48px;
      background: var(--accent);
      color: var(--bg-primary);
    }
    .play-btn:hover { background: var(--accent-hover); }
    .time-info {
      font-size: var(--font-xs);
      color: var(--text-muted);
      min-width: 50px;
      text-align: right;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0,0,0,0.3);
      border-top-color: var(--bg-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `,
})
export class MiniPlayerComponent {
  constructor(
    public player: AudioPlayerService,
    private router: Router,
  ) {}

  goToPlayer(): void {
    // Could navigate to a full player view
  }
}
