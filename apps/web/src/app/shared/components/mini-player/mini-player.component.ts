import { Component, HostListener, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AudioPlayerService, PlaybackSpeed } from '../../../core/services/audio-player.service';
import { PlaylistService } from '../../../core/services/playlist.service';

@Component({
  selector: 'app-mini-player',
  imports: [RouterLink],
  template: `
    @if (player.currentEpisode(); as episode) {
      <div class="mini-player">
        <!-- Interactive Waveform Progress Visualizer -->
        <div class="waveform-container" 
             (mousemove)="onMouseMove($event)" 
             (mouseleave)="onMouseLeave()" 
             (click)="onWaveformClick($event)"
             title="Haz clic para saltar en la reproducción">
          
          <canvas #waveformCanvas class="waveform-canvas"></canvas>
          
          @if (showTooltip()) {
            <div class="waveform-tooltip" [style.left.px]="tooltipLeft()">
              {{ tooltipText() }}
            </div>
          }
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

            <!-- Speed Control Dropdown Container -->
            <div class="speed-control-container">
              <button class="ctrl-btn speed-btn" (click)="toggleSpeedMenu($event)" aria-label="Cambiar velocidad de reproducción" [title]="'Velocidad: ' + player.speed() + 'x'">
                {{ player.speed() }}x
              </button>
              
              @if (showSpeedMenu()) {
                <div class="speed-menu">
                  @for (s of speeds; track s) {
                    <button 
                      class="speed-option" 
                      [class.active]="player.speed() === s" 
                      (click)="selectSpeed(s, $event)">
                      {{ s }}x
                    </button>
                  }
                </div>
              }
            </div>
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

    /* Speed Control Styles */
    .speed-control-container {
      position: relative;
    }
    .speed-btn {
      font-size: var(--font-xs);
      font-weight: 600;
      color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.1);
      width: 38px; height: 38px;
      min-width: 38px; min-height: 38px;
      border-radius: var(--radius-full);
    }
    .speed-btn:hover {
      color: var(--accent);
      border-color: rgba(var(--accent), 0.3);
      background: rgba(255,255,255,0.05);
    }
    .speed-menu {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      background: var(--bg-elevated);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
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
    .speed-option:hover {
      background: rgba(255,255,255,0.08);
      color: var(--text-primary);
    }
    .speed-option.active {
      background: var(--accent);
      color: var(--bg-primary);
      font-weight: 700;
    }

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
  @ViewChild('waveformCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

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
    private router: Router,
  ) {
    // Redraw waveform whenever progress, buffer or active episode changes
    effect(() => {
      // Accessing signals to track dependencies
      this.player.currentEpisode();
      this.player.progress();
      this.player.buffered();
      
      // Request redraw on the next frame to avoid DOM rendering lags
      requestAnimationFrame(() => {
        this.drawWaveform();
      });
    });
  }

  bufferedPercent(): number {
    const d = this.player.duration();
    return d > 0 ? (this.player.buffered() / d) * 100 : 0;
  }

  generateEpisodeWaveform(id: string, count: number): number[] {
    const heights: number[] = [];
    let seed = 0;
    for (let i = 0; i < id.length; i++) {
      seed += id.charCodeAt(i);
    }
    
    for (let i = 0; i < count; i++) {
      // Create high/low wave overlays
      const wave1 = Math.sin((i / count) * Math.PI * 6 + seed);
      const wave2 = Math.cos((i / count) * Math.PI * 18 - seed);
      const wave3 = Math.sin((i / count) * Math.PI * 36 + seed * 2);
      
      let val = Math.abs(wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2);
      
      // Symmetrical envelope shape
      const envelope = Math.sin((i / count) * Math.PI);
      val = val * 0.85 + 0.15;
      val = val * envelope;
      
      heights.push(Math.max(0.12, Math.min(0.9, val)));
    }
    return heights;
  }

  drawWaveform(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas sizes & high-DPI scaling
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

    const episode = this.player.currentEpisode();
    if (!episode) return;

    const barCount = 140; // Dense premium waveform bars
    const heights = this.generateEpisodeWaveform(episode._id, barCount);

    const progress = this.player.progress();
    const buffered = this.bufferedPercent();
    const hoverPct = this.hoverPercent();

    const barWidth = 3;
    const gap = 2;
    const totalBarWidth = barWidth + gap;

    const maxBars = Math.floor(width / totalBarWidth);

    for (let i = 0; i < maxBars; i++) {
      const idx = Math.floor(i * (barCount / maxBars));
      const val = heights[idx] || 0.12;

      // Vertical sizing and symmetry
      const barHeight = val * height * 0.85;
      const x = i * totalBarWidth;
      const y = (height - barHeight) / 2;

      const barPct = (i / maxBars) * 100;

      // Color selection
      let color = 'rgba(255, 255, 255, 0.14)'; // Unplayed background

      if (barPct <= progress) {
        // Played zone: Gradient (Purple to Pink)
        const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
        grad.addColorStop(0, '#a855f7'); // Violet-500
        grad.addColorStop(1, '#ec4899'); // Pink-500
        color = grad as any;
      } else if (barPct <= buffered) {
        // Buffered zone
        color = 'rgba(255, 255, 255, 0.32)';
      }

      // Hover preview highlight state
      if (this.showTooltip() && barPct <= hoverPct && barPct > progress) {
        color = 'rgba(168, 85, 247, 0.45)';
      }

      ctx.fillStyle = color as any;
      this.drawRoundedRect(ctx, x, y, barWidth, barHeight, 1.5);
    }
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
  onResize(): void {
    this.drawWaveform();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
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
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
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
  onDocumentClick(): void {
    this.showSpeedMenu.set(false);
  }
}


