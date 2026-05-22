import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { PlaylistService } from '../../core/services/playlist.service';
import { AudioPlayerService, PlayerEpisode } from '../../core/services/audio-player.service';
import { ExportService } from '../../core/services/export.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-playlist',
  template: `
    <div class="playlist-page container animate-fade-in">
      <div class="page-header">
        <div class="header-left">
          @if (pl.count() > 0) {
            <span class="count-badge">{{ pl.count() }} episodios</span>
          }
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

      <!-- Smart automated filters -->
      @if (!pl.isEmpty()) {
        <div class="smart-filters-container card">
          <div class="filters-header" (click)="toggleFiltersPanel()">
            <div class="filters-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <h3>Filtros y Reglas Automatizadas</h3>
            </div>
            <div class="filters-status">
              @if (activeRulesCount() > 0) {
                <span class="badge-active">{{ activeRulesCount() }} activas</span>
              } @else {
                <span class="badge-inactive">Desactivadas</span>
              }
              <span class="arrow" [class.open]="showFiltersPanel()">▼</span>
            </div>
          </div>

          @if (showFiltersPanel()) {
            <div class="filters-body">
              <p class="filters-subtitle">Configura reglas automáticas para ordenar y priorizar tu cola de reproducción e instalador USB.</p>
              
              <div class="rules-list">
                <!-- Rule 1: Priorizar no escuchados / empezados -->
                <div class="rule-card" [class.enabled]="isRuleEnabled('prioritize_unplayed')">
                  <div class="rule-main">
                    <div class="rule-info">
                      <span class="rule-name">Priorizar no escuchados / Empezados</span>
                      <span class="rule-desc">Mueve arriba de la cola los episodios que están a medias para terminarlos, o los que no has empezado.</span>
                    </div>
                    <label class="switch">
                      <input type="checkbox" [checked]="isRuleEnabled('prioritize_unplayed')" (change)="toggleRule('prioritize_unplayed')">
                      <span class="slider"></span>
                    </label>
                  </div>
                  @if (isRuleEnabled('prioritize_unplayed')) {
                    <div class="rule-config animate-fade-in">
                      <label>Criterio de orden:</label>
                      <select [value]="getRuleConfig('prioritize_unplayed', 'mode') || 'in_progress_first'" (change)="updateRuleConfig('prioritize_unplayed', 'mode', $any($event.target).value)">
                        <option value="in_progress_first">Primero en progreso (a medias)</option>
                        <option value="unplayed_first">Primero nuevos (sin empezar)</option>
                      </select>
                    </div>
                  }
                </div>

                <!-- Rule 2: Auto-añadir cortos al inicio -->
                <div class="rule-card" [class.enabled]="isRuleEnabled('prepend_short')">
                  <div class="rule-main">
                    <div class="rule-info">
                      <span class="rule-name">Auto-añadir cortos al inicio</span>
                      <span class="rule-desc">Coloca automáticamente al inicio los episodios de un podcast seleccionado si duran menos de cierto tiempo.</span>
                    </div>
                    <label class="switch">
                      <input type="checkbox" [checked]="isRuleEnabled('prepend_short')" (change)="toggleRule('prepend_short')">
                      <span class="slider"></span>
                    </label>
                  </div>
                  @if (isRuleEnabled('prepend_short')) {
                    <div class="rule-config animate-fade-in">
                      <div class="config-row">
                        <div class="config-col">
                          <label>Podcast:</label>
                          <select [value]="getRuleConfig('prepend_short', 'podcastId') || ''" (change)="updateRuleConfig('prepend_short', 'podcastId', $any($event.target).value)">
                            <option value="">-- Todos los Podcasts --</option>
                            @for (sub of subscriptions(); track sub._id) {
                              <option [value]="sub._id">{{ sub.title }}</option>
                            }
                          </select>
                        </div>
                        <div class="config-col">
                          <label>Duración máxima (minutos):</label>
                          <input type="number" min="1" max="180" [value]="getRuleConfig('prepend_short', 'maxMinutes') || 10" (input)="updateRuleConfig('prepend_short', 'maxMinutes', +$any($event.target).value)">
                        </div>
                      </div>
                    </div>
                  }
                </div>

                <!-- Rule 3: Binge-Listen (Agrupar por Podcast) -->
                <div class="rule-card" [class.enabled]="isRuleEnabled('group_by_podcast')">
                  <div class="rule-main">
                    <div class="rule-info">
                      <span class="rule-name">Agrupar por Podcast (Maratón)</span>
                      <span class="rule-desc">Mantiene juntos todos los episodios del mismo podcast en la cola para escucharlos seguidos.</span>
                    </div>
                    <label class="switch">
                      <input type="checkbox" [checked]="isRuleEnabled('group_by_podcast')" (change)="toggleRule('group_by_podcast')" [disabled]="isRuleEnabled('round_robin')">
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>

                <!-- Rule 4: Alternar podcasts (Shuffling por Show) -->
                <div class="rule-card" [class.enabled]="isRuleEnabled('round_robin')">
                  <div class="rule-main">
                    <div class="rule-info">
                      <span class="rule-name">Alternar Podcasts (Variedad)</span>
                      <span class="rule-desc">Distribuye los episodios de forma que nunca escuches dos episodios seguidos del mismo podcast.</span>
                    </div>
                    <label class="switch">
                      <input type="checkbox" [checked]="isRuleEnabled('round_robin')" (change)="toggleRule('round_robin')" [disabled]="isRuleEnabled('group_by_podcast')">
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>

                <!-- Rule 5: Ordenar por duración -->
                <div class="rule-card" [class.enabled]="isRuleEnabled('sort_by_duration')">
                  <div class="rule-main">
                    <div class="rule-info">
                      <span class="rule-name">Priorizar por duración</span>
                      <span class="rule-desc">Ordena los episodios de tu cola en base a su duración.</span>
                    </div>
                    <label class="switch">
                      <input type="checkbox" [checked]="isRuleEnabled('sort_by_duration')" (change)="toggleRule('sort_by_duration')">
                      <span class="slider"></span>
                    </label>
                  </div>
                  @if (isRuleEnabled('sort_by_duration')) {
                    <div class="rule-config animate-fade-in">
                      <label>Orden:</label>
                      <select [value]="getRuleConfig('sort_by_duration', 'order') || 'shortest_first'" (change)="updateRuleConfig('sort_by_duration', 'order', $any($event.target).value)">
                        <option value="shortest_first">Episodios más cortos primero (Rápidos)</option>
                        <option value="longest_first">Episodios más largos primero (Maratón)</option>
                      </select>
                    </div>
                  }
                </div>

                <!-- Rule 6: Ordenar por fecha de publicación -->
                <div class="rule-card" [class.enabled]="isRuleEnabled('sort_by_date')">
                  <div class="rule-main">
                    <div class="rule-info">
                      <span class="rule-name">Ordenar por fecha de publicación</span>
                      <span class="rule-desc">Ordena cronológicamente los episodios de la cola.</span>
                    </div>
                    <label class="switch">
                      <input type="checkbox" [checked]="isRuleEnabled('sort_by_date')" (change)="toggleRule('sort_by_date')">
                      <span class="slider"></span>
                    </label>
                  </div>
                  @if (isRuleEnabled('sort_by_date')) {
                    <div class="rule-config animate-fade-in">
                      <label>Criterio cronológico:</label>
                      <select [value]="getRuleConfig('sort_by_date', 'order') || 'newest_first'" (change)="updateRuleConfig('sort_by_date', 'order', $any($event.target).value)">
                        <option value="newest_first">Más recientes primero (Últimas novedades)</option>
                        <option value="oldest_first">Más antiguos primero (Orden cronológico)</option>
                      </select>
                    </div>
                  }
                </div>
              </div>

              <div class="filters-footer">
                <label class="auto-apply-checkbox">
                  <input type="checkbox" [checked]="autoApplyRules()" (change)="toggleAutoApply()">
                  <span class="checkbox-text">Aplicar reglas automáticamente al añadir episodios</span>
                </label>
                <button class="btn-apply-now" (click)="applyRulesNow()" [class.is-applying]="isApplyingRules()">
                  @if (isApplyingRules()) {
                    <span class="spinner"></span>
                    <span>Aplicando...</span>
                  } @else {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    <span>Aplicar y Organizar Cola</span>
                  }
                </button>
              </div>
            </div>
          }
        </div>
      }

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
                @if (episodeProgress()[episode._id]; as prog) {
                  <span class="ep-in-progress">Quedan {{ formatRemaining(episode.durationSeconds, prog.progress) }}</span>
                  <div class="ep-progress-bar">
                    <div class="ep-progress-fill" [style.width.%]="getProgressPct(episode.durationSeconds, prog.progress)"></div>
                  </div>
                } @else if (episode.duration) {
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

    /* ── Smart Automated Filters ── */
    .smart-filters-container {
      margin-bottom: var(--space-lg);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: var(--radius-xl);
      overflow: hidden;
      transition: all var(--transition-medium);
    }
    
    .filters-header {
      padding: var(--space-md) var(--space-xl);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      background: rgba(255, 255, 255, 0.02);
      transition: background var(--transition-fast);
    }
    .filters-header:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    
    .filters-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--text-primary);
    }
    .filters-title svg {
      color: var(--accent);
    }
    .filters-title h3 {
      font-size: var(--font-md);
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.01em;
    }
    
    .filters-status {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }
    .badge-active {
      background: var(--accent-dim);
      color: var(--accent);
      padding: 2px 10px;
      font-size: var(--font-xs);
      font-weight: 700;
      border-radius: var(--radius-full);
      border: 1px solid rgba(0, 212, 170, 0.2);
    }
    .badge-inactive {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
      padding: 2px 10px;
      font-size: var(--font-xs);
      font-weight: 600;
      border-radius: var(--radius-full);
    }
    
    .arrow {
      font-size: 10px;
      color: var(--text-muted);
      transition: transform var(--transition-fast);
      display: inline-block;
    }
    .arrow.open {
      transform: rotate(180deg);
      color: var(--accent);
    }
    
    .filters-body {
      padding: var(--space-xl);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      animation: fadeIn var(--transition-medium) ease;
    }
    
    .filters-subtitle {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      margin-bottom: var(--space-lg);
      line-height: 1.5;
    }
    
    .rules-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-md);
      margin-bottom: var(--space-xl);
    }
    
    .rule-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-lg);
      padding: var(--space-md);
      transition: all var(--transition-fast);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    .rule-card:hover {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .rule-card.enabled {
      background: rgba(0, 212, 170, 0.01);
      border-color: rgba(0, 212, 170, 0.15);
    }
    
    .rule-main {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-md);
    }
    
    .rule-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .rule-name {
      font-size: var(--font-sm);
      font-weight: 600;
      color: var(--text-primary);
    }
    .rule-card.enabled .rule-name {
      color: var(--accent);
    }
    .rule-desc {
      font-size: var(--font-xs);
      color: var(--text-muted);
      line-height: 1.4;
    }
    
    /* Toggle switch */
    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255, 255, 255, 0.1);
      transition: .3s;
      border-radius: var(--radius-full);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: var(--text-secondary);
      transition: .3s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: var(--accent-dim);
      border-color: rgba(0, 212, 170, 0.3);
    }
    input:checked + .slider:before {
      transform: translateX(18px);
      background-color: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }
    input:disabled + .slider {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .rule-config {
      padding: var(--space-sm) var(--space-md);
      background: rgba(255, 255, 255, 0.02);
      border-radius: var(--radius-md);
      border-left: 2px solid var(--accent);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rule-config label {
      font-size: var(--font-xs);
      color: var(--text-muted);
      font-weight: 500;
    }
    .rule-config select, .rule-config input {
      background: var(--bg-primary);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: var(--space-xs) var(--space-sm);
      font-size: var(--font-xs);
      outline: none;
      transition: border-color var(--transition-fast);
      width: 100%;
    }
    .rule-config select:focus, .rule-config input:focus {
      border-color: var(--accent);
    }
    
    .config-row {
      display: flex;
      gap: var(--space-md);
    }
    .config-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .filters-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-md);
      padding-top: var(--space-lg);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    
    .auto-apply-checkbox {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      cursor: pointer;
      user-select: none;
    }
    .auto-apply-checkbox input {
      accent-color: var(--accent);
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .checkbox-text {
      font-size: var(--font-xs);
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    .btn-apply-now {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      background: var(--accent);
      color: var(--bg-primary);
      border: none;
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      font-weight: 700;
      cursor: pointer;
      transition: all var(--transition-fast);
      min-height: var(--touch-min);
    }
    .btn-apply-now:hover {
      background: var(--accent-hover);
      box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
      transform: translateY(-1px);
    }
    .btn-apply-now.is-applying {
      opacity: 0.8;
      cursor: not-allowed;
    }
    
    /* Spinner for applying states */
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: rgba(0, 0, 0, 0.8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

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
    .ep-in-progress { display: inline-block; font-size: var(--font-xs); color: var(--accent); font-weight: 600; margin-top: 2px; }
    .ep-progress-bar { height: 2px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 5px; overflow: hidden; }
    .ep-progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s; }

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
export class PlaylistComponent implements OnInit {
  draggingIndex = signal<number>(-1);
  dragOverIndex = signal<number>(-1);
  showConfirm = signal(false);

  // Smart Rules State
  showFiltersPanel = signal(false);
  subscriptions = signal<any[]>([]);

  // Services injected
  public pl = inject(PlaylistService);
  public player = inject(AudioPlayerService);
  public exportService = inject(ExportService);
  private api = inject(ApiService);

  // Computed properties
  activeRulesCount = computed(() => this.pl.rules().filter(r => r.enabled).length);
  autoApplyRules = computed(() => this.pl.autoApplyRules());
  isApplyingRules = computed(() => this.pl.isApplyingRules());

  episodeProgress = signal<Record<string, { progress: number }>>({});

  ngOnInit() {
    this.loadSubscriptions();
    this.loadInProgress();
  }

  async loadInProgress() {
    try {
      const res = await this.api.getInProgress();
      const map: Record<string, { progress: number }> = {};
      for (const entry of (res.data || [])) {
        const epId = entry.episodeId?._id ?? entry.episodeId;
        if (epId && entry.progress > 0) {
          map[epId.toString()] = { progress: entry.progress };
        }
      }
      this.episodeProgress.set(map);
    } catch (err) {
      console.error('[PlaylistComponent] Error fetching in-progress episodes:', err);
    }
  }

  async loadSubscriptions() {
    try {
      const res = await this.api.getSubscriptions();
      if (res && res.success && Array.isArray(res.data)) {
        this.subscriptions.set(res.data);
      }
    } catch (err) {
      console.error('[PlaylistComponent] Error fetching subscriptions:', err);
    }
  }

  // Smart filters helpers
  isRuleEnabled(ruleId: string): boolean {
    return this.pl.rules().find(r => r.id === ruleId)?.enabled || false;
  }

  getRuleConfig(ruleId: string, key: string): any {
    return this.pl.rules().find(r => r.id === ruleId)?.config?.[key];
  }

  toggleRule(ruleId: string): void {
    this.pl.toggleRule(ruleId);
  }

  updateRuleConfig(ruleId: string, key: string, value: any): void {
    this.pl.updateRuleConfig(ruleId, key, value);
  }

  toggleAutoApply(): void {
    this.pl.toggleAutoApply();
  }

  applyRulesNow(): void {
    this.pl.applyRulesNow();
  }

  toggleFiltersPanel(): void {
    this.showFiltersPanel.set(!this.showFiltersPanel());
  }

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

  getProgressPct(durationSeconds: number, progressSeconds: number): number {
    if (!durationSeconds || durationSeconds <= 0) return 0;
    return Math.min(100, Math.round((progressSeconds / durationSeconds) * 100));
  }

  formatRemaining(durationSeconds: number, progressSeconds: number): string {
    if (!durationSeconds || durationSeconds <= 0) return '';
    const remaining = Math.max(0, durationSeconds - progressSeconds);
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m} min`;
    return 'menos de 1 min';
  }
}
