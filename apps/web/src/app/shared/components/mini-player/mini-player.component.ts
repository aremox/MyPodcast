import { Component, HostListener, signal, ViewChildren, QueryList, ElementRef, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AudioPlayerService, PlaybackSpeed } from '../../../core/services/audio-player.service';
import { PlaylistService } from '../../../core/services/playlist.service';

@Component({
  selector: 'app-mini-player',
  imports: [RouterLink],
  template: `
    @if (player.crossDeviceResume(); as resume) {
      <!-- ══════════════════════════════════════════════
           CROSS-DEVICE RESUME BANNER
      ══════════════════════════════════════════════ -->
      <div class="resume-banner" role="alert" aria-live="polite">
        <img
          [src]="resume.episode.podcastImageUrl || resume.episode.imageUrl || '/assets/placeholder.png'"
          [alt]="resume.episode.podcastTitle || 'Podcast'"
          class="resume-art"
        />
        <div class="resume-info">
          <span class="resume-label">Continúa escuchando</span>
          <span class="resume-title">{{ resume.episode.title }}</span>
          <span class="resume-meta">
            {{ resume.episode.podcastTitle }}
            &nbsp;·&nbsp;
            hace {{ formatRelativeTime(resume.lastPlayedAt) }}
            &nbsp;·&nbsp;
            {{ formatTime(resume.progress) }}
          </span>
        </div>
        <div class="resume-actions">
          <button class="resume-btn-play" (click)="player.resumeFromCrossDevice()" aria-label="Continuar reproduciendo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Continuar
          </button>
          <button class="resume-btn-dismiss" (click)="player.dismissCrossDeviceResume()" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    }

    @if (player.currentEpisode(); as episode) {

      <!-- ══════════════════════════════════════════════
           EXPANDED FULL-SCREEN PLAYER
      ══════════════════════════════════════════════ -->
      <div class="expanded-player" [class.is-open]="isExpanded()" (click)="onExpandedBackdropClick($event)">
        <div class="expanded-inner" (click)="$event.stopPropagation()">

          <!-- Blurred background art -->
          <div class="expanded-bg">
            <img [src]="episode.podcastImageUrl || episode.imageUrl || '/assets/placeholder.png'" alt="" class="expanded-bg-img"/>
            <div class="expanded-bg-overlay"></div>
          </div>

          <!-- Top bar: collapse button + queue info -->
          <div class="expanded-topbar">
            <button class="exp-btn-icon" (click)="isExpanded.set(false)" aria-label="Contraer reproductor" title="Cerrar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <span class="exp-queue-label">
              @if (pl.count() > 0) { {{ pl.currentIndex() + 1 }}/{{ pl.count() }} en cola }
            </span>
            <button class="exp-btn-icon" (click)="router.navigate(['/playlist']); isExpanded.set(false)" aria-label="Ver cola" title="Ver cola">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <polygon points="3 6 3 18 5.5 12" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          </div>

          <!-- Large artwork -->
          <div class="expanded-art-wrap">
            <img
              [src]="episode.podcastImageUrl || episode.imageUrl || '/assets/placeholder.png'"
              [alt]="episode.title"
              class="expanded-art"
              [class.is-playing]="player.isPlaying()"
            />
          </div>

          <!-- Episode info -->
          <div class="expanded-info">
            <span class="expanded-title">{{ episode.title }}</span>
            <span class="expanded-podcast">
              {{ episode.podcastTitle }}
              @if (episode.publishedAt) {
                · {{ formatDate(episode.publishedAt) }}
              }
            </span>
          </div>

          <!-- Waveform progress -->
          <div class="expanded-waveform-wrap"
               (mousemove)="onMouseMove($event)"
               (mouseleave)="onMouseLeave()"
               (click)="onWaveformClick($event)"
               title="Haz clic para saltar">
            <canvas #waveformCanvas class="waveform-canvas"></canvas>
            @if (showTooltip()) {
              <div class="waveform-tooltip" [style.left.px]="tooltipLeft()">{{ tooltipText() }}</div>
            }
          </div>

          <!-- Time display -->
          <div class="expanded-time">
            <span>{{ player.formattedCurrentTime() }}</span>
            <span>-{{ player.formattedRemaining() }}</span>
          </div>

          <!-- Big controls -->
          <div class="expanded-controls">
            <!-- Prev -->
            <button class="exp-ctrl exp-ctrl-nav" (click)="player.playPrev()" [disabled]="!pl.hasPrev()" aria-label="Anterior">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="19 20 9 12 19 4"/><rect x="5" y="4" width="2" height="16" rx="1"/>
              </svg>
            </button>

            <!-- -15s -->
            <button class="exp-ctrl exp-ctrl-seek" (click)="player.seekRelative(-15)" aria-label="Retroceder 15s">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                <text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="6.5" font-weight="bold">15</text>
              </svg>
            </button>

            <!-- Play/Pause -->
            <button class="exp-ctrl exp-ctrl-play" (click)="player.togglePlay()" [attr.aria-label]="player.isPlaying() ? 'Pausar' : 'Reproducir'">
              @if (player.isLoading()) {
                <div class="spinner-lg"></div>
              } @else if (player.isPlaying()) {
                <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              } @else {
                <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>

            <!-- +30s -->
            <button class="exp-ctrl exp-ctrl-seek" (click)="player.seekRelative(30)" aria-label="Avanzar 30s">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                <text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="6.5" font-weight="bold">30</text>
              </svg>
            </button>

            <!-- Next -->
            <button class="exp-ctrl exp-ctrl-nav" (click)="player.playNext()" [disabled]="!pl.hasNext()" aria-label="Siguiente">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 4 15 12 5 20"/><rect x="17" y="4" width="2" height="16" rx="1"/>
              </svg>
            </button>
          </div>

          <!-- Speed selector -->
          <div class="expanded-speed-row">
            @for (s of speeds; track s) {
              <button
                class="exp-speed-pill"
                [class.active]="player.speed() === s"
                (click)="player.setSpeed(s)">
                {{ s }}x
              </button>
            }
          </div>

        </div>
      </div>

      <!-- ══════════════════════════════════════════════
           MINI BAR (always visible at bottom)
      ══════════════════════════════════════════════ -->
      <div class="mini-player">
        <!-- Waveform (hidden when expanded — shared canvas is in expanded view) -->
        @if (!isExpanded()) {
          <div class="waveform-container"
               (mousemove)="onMouseMove($event)"
               (mouseleave)="onMouseLeave()"
               (click)="onWaveformClick($event)"
               title="Haz clic para saltar en la reproducción">
            <canvas #waveformCanvas class="waveform-canvas"></canvas>
            @if (showTooltip()) {
              <div class="waveform-tooltip" [style.left.px]="tooltipLeft()">{{ tooltipText() }}</div>
            }
          </div>
        }

        <div class="player-content">
          <!-- Episode info — click opens expanded player -->
          <button class="episode-info" (click)="isExpanded.set(true)" aria-label="Ver reproductor completo">
            <img
              [src]="episode.podcastImageUrl || episode.imageUrl || '/assets/placeholder.png'"
              [alt]="episode.title"
              class="episode-art"
            />
            <div class="episode-text">
              <span class="episode-title">{{ episode.title }}</span>
              <span class="podcast-title">
                {{ episode.podcastTitle }}
                @if (episode.publishedAt) {
                  · {{ formatDate(episode.publishedAt) }}
                }
              </span>
            </div>
          </button>

          <!-- Controls -->
          <div class="player-controls">
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

            @if (pl.hasNext()) {
              <button class="ctrl-btn ctrl-nav" (click)="player.playNext()" aria-label="Siguiente episodio" title="Siguiente">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 4 15 12 5 20"/><rect x="17" y="4" width="2" height="16" rx="1"/>
                </svg>
              </button>
            }

            <div class="speed-control-container">
              <button class="ctrl-btn speed-btn" (click)="toggleSpeedMenu($event)" aria-label="Velocidad" [title]="'Velocidad: ' + player.speed() + 'x'">
                {{ player.speed() }}x
              </button>
              @if (showSpeedMenu()) {
                <div class="speed-menu">
                  @for (s of speeds; track s) {
                    <button class="speed-option" [class.active]="player.speed() === s" (click)="selectSpeed(s, $event)">{{ s }}x</button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Right: time + expand button -->
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
            <!-- Expand button -->
            <button class="btn-expand" (click)="isExpanded.set(true)" aria-label="Ampliar reproductor" title="Ampliar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    /* ══════════════════════════════════════════
       CROSS-DEVICE RESUME BANNER
    ══════════════════════════════════════════ */
    .resume-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: calc(var(--z-mini-player) + 5);
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(10, 10, 20, 0.97));
      border-top: 1px solid rgba(0, 212, 170, 0.3);
      backdrop-filter: blur(20px);
      box-shadow: 0 -4px 32px rgba(0, 212, 170, 0.12), 0 -1px 0 rgba(255,255,255,0.04);
      animation: resumeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes resumeSlideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .resume-art {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-sm);
      object-fit: cover;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }

    .resume-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
      gap: 2px;
    }
    .resume-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
    }
    .resume-title {
      font-size: var(--font-sm);
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .resume-meta {
      font-size: var(--font-xs);
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .resume-actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-shrink: 0;
    }
    .resume-btn-play {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      background: var(--accent);
      color: var(--bg-primary);
      border-radius: var(--radius-full);
      font-size: var(--font-sm);
      font-weight: 700;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }
    .resume-btn-play:hover {
      background: var(--accent-hover);
      transform: scale(1.03);
      box-shadow: 0 4px 16px rgba(0, 212, 170, 0.4);
    }
    .resume-btn-dismiss {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      color: var(--text-muted);
      transition: all var(--transition-fast);
    }
    .resume-btn-dismiss:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.08);
    }

    @media (max-width: 600px) {
      .resume-banner {
        flex-wrap: wrap;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
      }
      .resume-info { flex-basis: calc(100% - 68px); }
      .resume-actions { width: 100%; justify-content: flex-end; }
      .resume-btn-play { flex: 1; justify-content: center; }
    }
    /* ══════════════════════════════════════════
       EXPANDED PLAYER
    ══════════════════════════════════════════ */
    .expanded-player {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-mini-player) + 10);
      display: flex;
      align-items: flex-end;
      pointer-events: none;
      /* backdrop click area */
    }
    .expanded-player.is-open { pointer-events: all; }

    .expanded-inner {
      position: relative;
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      background: var(--bg-elevated);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 var(--space-xl) var(--space-2xl);
      /* Slide-up animation */
      transform: translateY(100%);
      transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
      max-height: 92vh;
    }
    .expanded-player.is-open .expanded-inner {
      transform: translateY(0);
    }

    /* Blurred background */
    .expanded-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }
    .expanded-bg-img {
      width: 100%; height: 100%;
      object-fit: cover;
      filter: blur(60px) saturate(1.8);
      transform: scale(1.2);
      opacity: 0.35;
    }
    .expanded-bg-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(10,10,14,0.6) 0%, rgba(10,10,14,0.92) 60%);
    }

    /* All inner content above bg */
    .expanded-topbar, .expanded-art-wrap, .expanded-info,
    .expanded-waveform-wrap, .expanded-time, .expanded-controls,
    .expanded-speed-row { position: relative; z-index: 1; }

    /* Top bar */
    .expanded-topbar {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) 0 var(--space-md);
    }
    .exp-btn-icon {
      display: flex; align-items: center; justify-content: center;
      width: 44px; height: 44px;
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }
    .exp-btn-icon:hover { color: var(--text-primary); background: rgba(255,255,255,0.08); }
    .exp-queue-label {
      font-size: var(--font-xs);
      color: var(--text-muted);
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* Artwork */
    .expanded-art-wrap {
      margin: var(--space-md) 0 var(--space-xl);
    }
    .expanded-art {
      width: min(280px, 60vw);
      height: min(280px, 60vw);
      border-radius: var(--radius-xl);
      object-fit: cover;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
      transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .expanded-art.is-playing {
      transform: scale(1.04);
      box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,170,0.12);
    }

    /* Episode info */
    .expanded-info {
      width: 100%;
      text-align: center;
      margin-bottom: var(--space-lg);
      padding: 0 var(--space-md);
    }
    .expanded-title {
      display: block;
      font-size: var(--font-lg);
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.3;
      margin-bottom: 6px;
      /* Multi-line with limit */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .expanded-podcast {
      display: block;
      font-size: var(--font-sm);
      color: var(--accent);
      font-weight: 600;
    }

    /* Waveform in expanded */
    .expanded-waveform-wrap {
      width: 100%;
      height: 56px;
      cursor: pointer;
      position: relative;
      margin-bottom: var(--space-sm);
    }

    /* Time display */
    .expanded-time {
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 2px;
      margin-bottom: var(--space-xl);
    }
    .expanded-time span { font-size: var(--font-xs); color: var(--text-muted); font-weight: 500; }

    /* Big controls */
    .expanded-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-lg);
      width: 100%;
      margin-bottom: var(--space-xl);
    }
    .exp-ctrl {
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-full);
      transition: all var(--transition-fast);
      color: var(--text-primary);
    }
    .exp-ctrl:disabled { opacity: 0.3; pointer-events: none; }
    .exp-ctrl-nav {
      width: 52px; height: 52px;
      color: var(--text-secondary);
    }
    .exp-ctrl-nav:hover { color: var(--accent); background: var(--accent-dim); }
    .exp-ctrl-seek {
      width: 60px; height: 60px;
    }
    .exp-ctrl-seek:hover { background: rgba(255,255,255,0.08); }
    .exp-ctrl-play {
      width: 80px; height: 80px;
      background: var(--accent);
      color: var(--bg-primary);
      box-shadow: 0 8px 32px rgba(0,212,170,0.4);
    }
    .exp-ctrl-play:hover {
      background: var(--accent-hover);
      transform: scale(1.06);
      box-shadow: 0 12px 40px rgba(0,212,170,0.5);
    }
    .exp-ctrl-play:active { transform: scale(0.96); }

    /* Speed pills */
    .expanded-speed-row {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
      justify-content: center;
    }
    .exp-speed-pill {
      padding: 8px 16px;
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      font-weight: 600;
      color: var(--text-muted);
      border: 1px solid rgba(255,255,255,0.1);
      transition: all var(--transition-fast);
      min-height: 40px;
    }
    .exp-speed-pill:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.25); }
    .exp-speed-pill.active {
      background: var(--accent);
      color: var(--bg-primary);
      border-color: var(--accent);
      box-shadow: 0 4px 12px rgba(0,212,170,0.3);
    }

    /* Spinner large */
    .spinner-lg {
      width: 32px; height: 32px;
      border: 3px solid rgba(0,0,0,0.2);
      border-top-color: var(--bg-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* ══════════════════════════════════════════
       MINI BAR
    ══════════════════════════════════════════ */
    .mini-player {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: var(--z-mini-player);
      background: var(--bg-elevated);
      border-top: 1px solid rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
    }

    /* Waveform visualizer container */
    .waveform-container {
      height: 48px;
      background: rgba(0, 0, 0, 0.2);
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: center;
      padding: 0 var(--space-lg);
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .waveform-canvas {
      width: 100%;
      height: 36px;
      display: block;
    }
    .waveform-tooltip {
      position: absolute;
      bottom: calc(100% - 4px);
      transform: translateX(-50%);
      background: #18181b;
      color: #fff;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 600;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      pointer-events: none;
      z-index: 1010;
      white-space: nowrap;
      animation: fadeIn 0.1s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, 4px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    .player-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-sm) var(--space-lg);
      height: 72px;
      gap: var(--space-md);
    }

    /* Episode info — now a button */
    .episode-info {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      flex: 1;
      min-width: 0;
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
      text-align: left;
      padding: 0;
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

    /* Speed Control */
    .speed-control-container { position: relative; }
    .speed-btn {
      font-size: var(--font-xs);
      font-weight: 600;
      color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.1);
      width: 38px; height: 38px;
      min-width: 38px; min-height: 38px;
      border-radius: var(--radius-full);
    }
    .speed-btn:hover { color: var(--accent); background: rgba(255,255,255,0.05); }
    .speed-menu {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      background: var(--bg-elevated);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
      backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      padding: 6px;
      min-width: 76px;
      z-index: 1000;
      animation: fadeInUp 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translate(-50%, 8px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .speed-option {
      padding: 6px 12px;
      font-size: var(--font-xs);
      font-weight: 500;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      text-align: center;
      transition: all var(--transition-fast);
      width: 100%;
      background: transparent;
      border: none;
      cursor: pointer;
    }
    .speed-option:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
    .speed-option.active { background: var(--accent); color: var(--bg-primary); font-weight: 700; }

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

    /* Expand button */
    .btn-expand {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      border-radius: var(--radius-full);
      color: var(--text-muted);
      transition: all var(--transition-fast);
    }
    .btn-expand:hover { color: var(--accent); background: var(--accent-dim); }

    /* Spinner */
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid rgba(0,0,0,0.3);
      border-top-color: var(--bg-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Tesla / medium screens (769–1279px) ── */
    @media (min-width: 769px) and (max-width: 1279px) {
      .waveform-container { height: 56px; }
      .waveform-canvas { height: 44px; }
      .player-content {
        height: 88px;
        padding: var(--space-md) var(--space-xl);
      }
      .episode-art { width: 60px; height: 60px; }
      .episode-title { font-size: var(--font-md); max-width: 400px; }
      .podcast-title { font-size: var(--font-sm); }
      .player-controls { gap: var(--space-md); }
      .ctrl-btn { min-width: 52px; min-height: 52px; }
      .ctrl-btn svg { width: 24px; height: 24px; }
      .play-btn { width: 56px; height: 56px; }
      .play-btn svg { width: 28px; height: 28px; }
      .speed-btn { width: 48px; height: 48px; min-width: 48px; min-height: 48px; font-size: var(--font-sm); }
      .speed-option { font-size: var(--font-sm); padding: 8px 16px; }
      .time-display { font-size: var(--font-sm); }
      .btn-expand { width: 44px; height: 44px; }
      .btn-expand svg { width: 22px; height: 22px; }
      /* Expanded player bigger on Tesla */
      .expanded-art { width: min(320px, 50vw); height: min(320px, 50vw); }
      .expanded-title { font-size: var(--font-xl); }
      .exp-ctrl-play { width: 96px; height: 96px; }
      .exp-ctrl-play svg { width: 44px; height: 44px; }
      .exp-ctrl-seek { width: 72px; height: 72px; }
      .exp-ctrl-seek svg { width: 34px; height: 34px; }
      .exp-ctrl-nav { width: 64px; height: 64px; }
      .exp-ctrl-nav svg { width: 32px; height: 32px; }
      .exp-speed-pill { padding: 10px 20px; font-size: var(--font-sm); min-height: 48px; }
    }
  `,
})
export class MiniPlayerComponent {
  @ViewChildren('waveformCanvas') canvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;

  readonly isExpanded = signal(false);
  readonly showSpeedMenu = signal(false);
  readonly speeds: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.3, 1.5, 1.75, 2];

  // Tooltip & hover preview state
  readonly showTooltip = signal(false);
  readonly tooltipText = signal('');
  readonly tooltipLeft = signal(0);
  readonly hoverPercent = signal(0);

  constructor(
    public player: AudioPlayerService,
    public pl: PlaylistService,
    public router: Router,
  ) {
    // Redraw waveform whenever progress, buffer or active episode changes
    effect(() => {
      this.player.currentEpisode();
      this.player.progress();
      this.player.buffered();
      requestAnimationFrame(() => { this.drawWaveform(); });
    });
  }

  onExpandedBackdropClick(event: MouseEvent): void {
    // Close if clicking the dark backdrop (not the inner panel)
    this.isExpanded.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isExpanded()) this.isExpanded.set(false);
  }

  bufferedPercent(): number {
    const d = this.player.duration();
    return d > 0 ? (this.player.buffered() / d) * 100 : 0;
  }

  generateEpisodeWaveform(id: string, count: number): number[] {
    const heights: number[] = [];
    let seed = 0;
    for (let i = 0; i < id.length; i++) { seed += id.charCodeAt(i); }
    for (let i = 0; i < count; i++) {
      const wave1 = Math.sin((i / count) * Math.PI * 6 + seed);
      const wave2 = Math.cos((i / count) * Math.PI * 18 - seed);
      const wave3 = Math.sin((i / count) * Math.PI * 36 + seed * 2);
      let val = Math.abs(wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2);
      const envelope = Math.sin((i / count) * Math.PI);
      val = val * 0.85 + 0.15;
      val = val * envelope;
      heights.push(Math.max(0.12, Math.min(0.9, val)));
    }
    return heights;
  }

  drawWaveform(): void {
    if (!this.canvasRefs || this.canvasRefs.length === 0) return;

    const episode = this.player.currentEpisode();
    if (!episode) return;

    const barCount = 140;
    const heights = this.generateEpisodeWaveform(episode._id, barCount);
    const progress = this.player.progress();
    const buffered = this.bufferedPercent();
    const hoverPct = this.hoverPercent();

    this.canvasRefs.forEach(canvasRef => {
      const canvas = canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = 3;
      const gap = 2;
      const totalBarWidth = barWidth + gap;
      const maxBars = Math.floor(width / totalBarWidth);

      for (let i = 0; i < maxBars; i++) {
        const idx = Math.floor(i * (barCount / maxBars));
        const val = heights[idx] || 0.12;
        const barHeight = val * height * 0.85;
        const x = i * totalBarWidth;
        const y = (height - barHeight) / 2;
        const barPct = (i / maxBars) * 100;

        let color = 'rgba(255, 255, 255, 0.14)';
        if (barPct <= progress) {
          const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
          grad.addColorStop(0, '#a855f7');
          grad.addColorStop(1, '#ec4899');
          color = grad as any;
        } else if (barPct <= buffered) {
          color = 'rgba(255, 255, 255, 0.32)';
        }
        if (this.showTooltip() && barPct <= hoverPct && barPct > progress) {
          color = 'rgba(168, 85, 247, 0.45)';
        }

        ctx.fillStyle = color as any;
        this.drawRoundedRect(ctx, x, y, barWidth, barHeight, 1.5);
      }
    });
  }

  drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  @HostListener('window:resize')
  onResize(): void { this.drawWaveform(); }

  onMouseMove(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
    this.hoverPercent.set(pct);
    this.showTooltip.set(true);
    const duration = this.player.duration();
    if (duration > 0) {
      const hoverTime = (pct / 100) * duration;
      this.tooltipText.set(this.player.formatTime(hoverTime));
    }
    this.tooltipLeft.set(mouseX);
    this.drawWaveform();
  }

  onMouseLeave(): void {
    this.showTooltip.set(false);
    this.hoverPercent.set(0);
    this.drawWaveform();
  }

  onWaveformClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
    this.player.seekToPercent(pct);
  }

  toggleSpeedMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showSpeedMenu.update(v => !v);
  }

  selectSpeed(speed: PlaybackSpeed, event: MouseEvent): void {
    event.stopPropagation();
    this.player.setSpeed(speed);
    this.showSpeedMenu.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.showSpeedMenu.set(false); }

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatTime(seconds: number): string {
    return this.player.formatTime(seconds);
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'un momento';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    return `${days} día${days !== 1 ? 's' : ''}`;
  }
}
