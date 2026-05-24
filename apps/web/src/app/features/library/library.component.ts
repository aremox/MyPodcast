import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-library',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="library-page container animate-fade-in">
      <header class="page-header">
        <div>
          <h1 class="page-title">Mi Biblioteca</h1>
          <p class="page-subtitle">{{ podcasts().length }} programas</p>
        </div>
        <div class="header-actions">
          @if (podcasts().length > 0) {
            <button
              class="btn-edit"
              [class.active]="editMode()"
              (click)="editMode.set(!editMode())"
              [attr.aria-label]="editMode() ? 'Salir del modo edición' : 'Editar biblioteca'"
            >
              @if (editMode()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Listo
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Editar
              }
            </button>
          }
          <button class="btn-add" (click)="showAddModal.set(true)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Añadir podcast
          </button>
        </div>
      </header>

      @if (editMode()) {
        <div class="edit-banner animate-fade-in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Modo edición — Pulsa el botón 🗑 en un podcast para eliminarlo de tu biblioteca
        </div>
      }

      @if (loading()) {
        <div class="grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="podcast-card skeleton-card">
              <div class="skeleton" style="width:100%;aspect-ratio:1"></div>
              <div class="skeleton" style="width:70%;height:16px;margin-top:12px"></div>
              <div class="skeleton" style="width:50%;height:12px;margin-top:8px"></div>
            </div>
          }
        </div>
      } @else if (podcasts().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">📡</span>
          <h2>Sin podcasts aún</h2>
          <p>Añade tu primer podcast de iVoox para empezar</p>
          <button class="btn-add" (click)="showAddModal.set(true)">Añadir podcast</button>
        </div>
      } @else {
        <div class="grid">
          @for (podcast of podcasts(); track podcast._id) {
            <div class="card-wrapper" [class.edit-mode]="editMode()" [class.removing]="removingId() === podcast._id">
              <!-- Delete button (edit mode only) -->
              @if (editMode()) {
                <button
                  class="btn-delete-card"
                  (click)="confirmDelete(podcast)"
                  [attr.aria-label]="'Eliminar ' + podcast.title"
                  title="Eliminar podcast"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              }

              <!-- Card: link in view mode, non-navigable in edit mode -->
              @if (editMode()) {
                <div class="podcast-card edit-card">
                  <div class="card-img-wrapper">
                    <img [src]="podcast.imageUrl || '/assets/placeholder.png'" [alt]="podcast.title" class="card-img" loading="lazy" />
                    @if (podcast.newEpisodesCount > 0) {
                      <div class="new-episodes-bubble">{{ podcast.newEpisodesCount }}</div>
                    }
                    <div class="card-overlay">
                      <span class="episode-count">{{ podcast.episodeCount }} ep.</span>
                    </div>
                    <div class="card-edit-overlay">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      <span>Eliminar</span>
                    </div>
                  </div>
                  <h3 class="card-title">{{ podcast.title }}</h3>
                  <p class="card-author">{{ podcast.author }}</p>
                </div>
              } @else {
                <a [routerLink]="['/podcast', podcast._id]" class="podcast-card" [style.animation-delay]="($index * 50) + 'ms'">
                  <div class="card-img-wrapper">
                    <img [src]="podcast.imageUrl || '/assets/placeholder.png'" [alt]="podcast.title" class="card-img" loading="lazy" />
                    @if (podcast.newEpisodesCount > 0) {
                      <div class="new-episodes-bubble">{{ podcast.newEpisodesCount }}</div>
                    }
                    <div class="card-overlay">
                      <span class="episode-count">{{ podcast.episodeCount }} ep.</span>
                    </div>
                  </div>
                  <h3 class="card-title">{{ podcast.title }}</h3>
                  <p class="card-author">{{ podcast.author }}</p>
                </a>
              }
            </div>
          }
        </div>
      }

      <!-- Add Podcast Modal -->
      @if (showAddModal()) {
        <div class="modal-backdrop" (click)="showAddModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2 class="modal-title">Añadir Podcast</h2>
            <p class="modal-desc">Pega la URL de un podcast de iVoox</p>
            <input
              type="text"
              [(ngModel)]="podcastUrl"
              placeholder="https://www.ivoox.com/podcast-nombre_sq_f..._1.html"
              class="modal-input"
            />
            @if (addError()) {
              <p class="error-text">{{ addError() }}</p>
            }
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showAddModal.set(false)">Cancelar</button>
              <button class="btn-confirm" (click)="addPodcast()" [disabled]="adding()">
                {{ adding() ? 'Añadiendo...' : 'Añadir' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Confirm Delete Modal -->
      @if (podcastToDelete()) {
        <div class="modal-backdrop" (click)="cancelDelete()">
          <div class="modal modal-delete" (click)="$event.stopPropagation()">
            <div class="delete-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h2 class="modal-title">Eliminar podcast</h2>
            <p class="modal-desc">
              ¿Eliminar <strong>{{ podcastToDelete().title }}</strong> de tu biblioteca?
              <br />
              Se eliminarán también todos sus episodios y datos de reproducción.
            </p>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="cancelDelete()" [disabled]="deleting()">Cancelar</button>
              <button class="btn-delete" (click)="deletePodcast()" [disabled]="deleting()">
                @if (deleting()) {
                  <div class="mini-spinner"></div>
                  Eliminando...
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                  Eliminar
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-xl) 0;
      flex-wrap: wrap;
      gap: var(--space-md);
    }
    .page-title { font-family: var(--font-display); font-size: var(--font-3xl); font-weight: 800; }
    .page-subtitle { color: var(--text-muted); font-size: var(--font-sm); margin-top: var(--space-xs); }

    .header-actions { display: flex; align-items: center; gap: var(--space-sm); }

    .btn-edit {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-full); color: var(--text-secondary);
      font-size: var(--font-sm); font-weight: 500;
      min-height: var(--touch-min); transition: all var(--transition-fast);
    }
    .btn-edit:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .btn-edit.active {
      background: var(--accent-dim); border-color: rgba(0,212,170,0.3);
      color: var(--accent);
    }

    .btn-add {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      background: var(--accent-gradient); color: var(--bg-primary);
      font-weight: 600; border-radius: var(--radius-full);
      min-height: var(--touch-min); transition: all var(--transition-fast);
    }
    .btn-add:hover { transform: translateY(-2px); box-shadow: var(--shadow-glow); }

    /* Edit mode banner */
    .edit-banner {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background: rgba(124, 58, 237, 0.1);
      border: 1px solid rgba(124, 58, 237, 0.2);
      border-radius: var(--radius-md);
      color: var(--accent-secondary);
      font-size: var(--font-sm);
      margin-bottom: var(--space-lg);
    }

    /* Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-lg);
      padding-bottom: var(--space-2xl);
    }

    /* Card wrapper — contains delete btn + card */
    .card-wrapper { position: relative; }
    .card-wrapper.removing {
      animation: removeCard 0.3s ease forwards;
    }
    @keyframes removeCard {
      to { opacity: 0; transform: scale(0.85); }
    }

    /* Delete button — top-right badge */
    .btn-delete-card {
      position: absolute; top: -8px; right: -8px; z-index: 10;
      width: 32px; height: 32px;
      border-radius: 50%;
      background: var(--error); color: #fff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(239,68,68,0.5);
      transition: all var(--transition-spring);
      animation: badgePop 0.3s var(--transition-spring) both;
    }
    .btn-delete-card:hover { transform: scale(1.15); box-shadow: 0 4px 16px rgba(239,68,68,0.6); }
    @keyframes badgePop { from { transform: scale(0); } to { transform: scale(1); } }

    /* Base card styles */
    .podcast-card {
      display: flex; flex-direction: column;
      border-radius: var(--radius-lg);
      background: var(--bg-surface); padding: var(--space-md);
      transition: all var(--transition-normal);
      animation: fadeInUp var(--transition-slow) ease both;
      color: var(--text-primary);
    }
    .podcast-card:hover {
      background: var(--bg-card-hover);
      transform: translateY(-4px);
      box-shadow: var(--shadow-md);
    }

    /* Edit mode card — no navigation, dimmed with delete overlay */
    .edit-card {
      cursor: pointer;
      border: 2px solid rgba(239,68,68,0.2);
    }
    .edit-card:hover { border-color: var(--error); transform: translateY(-2px); }
    .edit-card:hover .card-edit-overlay { opacity: 1; }
    .edit-card:hover .card-img { filter: brightness(0.4); }

    .card-img-wrapper {
      position: relative; border-radius: var(--radius-md);
      overflow: hidden; aspect-ratio: 1;
    }
    .new-episodes-bubble {
      position: absolute;
      top: 8px; right: 8px;
      background-color: var(--error);
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      min-width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      padding: 0 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      z-index: 10;
      animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popIn {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .card-img { width: 100%; height: 100%; object-fit: cover; transition: filter var(--transition-normal); }
    .card-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: var(--space-sm) var(--space-md);
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
    }
    .card-edit-overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: var(--space-sm); color: #fff; font-size: var(--font-sm); font-weight: 600;
      opacity: 0; transition: opacity var(--transition-normal);
    }
    .episode-count { 
      font-size: var(--font-xs); 
      color: #ffffff; 
      font-weight: 600; 
      background: rgba(0, 0, 0, 0.7);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      backdrop-filter: blur(4px);
      display: inline-block;
    }
    .card-title {
      font-size: var(--font-sm); font-weight: 600; margin-top: var(--space-md);
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .card-author { font-size: var(--font-xs); color: var(--text-muted); margin-top: var(--space-xs); }
    .skeleton-card { padding: var(--space-md); }

    /* Shake animation in edit mode */
    .card-wrapper.edit-mode .podcast-card {
      animation: wiggle 0.5s ease both;
    }
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(-1deg); }
      40% { transform: rotate(1.5deg); }
      60% { transform: rotate(-1deg); }
      80% { transform: rotate(0.5deg); }
    }

    /* Empty state */
    .empty-state {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: var(--space-3xl) var(--space-lg); text-align: center;
    }
    .empty-icon { font-size: 4rem; margin-bottom: var(--space-lg); }
    .empty-state h2 { font-size: var(--font-2xl); font-weight: 700; }
    .empty-state p { color: var(--text-muted); margin: var(--space-sm) 0 var(--space-lg); }

    /* Modals */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: var(--z-modal); animation: fadeIn 0.2s ease;
      backdrop-filter: blur(4px);
    }
    .modal {
      background: var(--bg-elevated); border-radius: var(--radius-xl);
      padding: var(--space-xl); width: 90%; max-width: 480px;
      animation: fadeInUp 0.3s ease;
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: var(--shadow-lg);
    }
    .modal-delete { max-width: 420px; }
    .delete-icon-wrap {
      display: flex; align-items: center; justify-content: center;
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(239,68,68,0.1); color: var(--error);
      margin: 0 auto var(--space-lg);
    }
    .modal-title { font-size: var(--font-xl); font-weight: 700; text-align: center; }
    .modal-desc { color: var(--text-secondary); font-size: var(--font-sm); margin: var(--space-sm) 0 var(--space-md); text-align: center; line-height: 1.6; }
    .modal-input { width: 100%; height: var(--touch-comfortable); font-size: var(--font-md); margin-top: var(--space-sm); }
    .error-text { color: var(--error); font-size: var(--font-sm); margin-top: var(--space-sm); }
    .modal-actions {
      display: flex; gap: var(--space-md); justify-content: center;
      margin-top: var(--space-lg);
    }
    .btn-cancel {
      padding: var(--space-md) var(--space-lg); border-radius: var(--radius-full);
      color: var(--text-secondary); min-height: var(--touch-min);
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      font-weight: 500; transition: all var(--transition-fast);
    }
    .btn-cancel:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .btn-cancel:disabled { opacity: 0.5; }
    .btn-confirm {
      padding: var(--space-md) var(--space-lg); background: var(--accent);
      color: var(--bg-primary); font-weight: 600;
      border-radius: var(--radius-full); min-height: var(--touch-min);
      transition: all var(--transition-fast);
    }
    .btn-confirm:hover { background: var(--accent-hover); }
    .btn-confirm:disabled { opacity: 0.6; }
    .btn-delete {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      background: var(--error); color: #fff; font-weight: 600;
      border-radius: var(--radius-full); min-height: var(--touch-min);
      transition: all var(--transition-fast);
    }
    .btn-delete:hover:not(:disabled) { background: #dc2626; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239,68,68,0.4); }
    .btn-delete:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Mini spinner inside button */
    .mini-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class LibraryComponent implements OnInit {
  podcasts = signal<any[]>([]);
  loading = signal(true);
  editMode = signal(false);
  showAddModal = signal(false);
  podcastUrl = '';
  adding = signal(false);
  addError = signal('');
  podcastToDelete = signal<any>(null);
  deleting = signal(false);
  removingId = signal<string>('');

  constructor(private api: ApiService) {}

  async ngOnInit() {
    await this.loadPodcasts();
  }

  async loadPodcasts() {
    this.loading.set(true);
    try {
      const res = await this.api.getSubscriptions();
      const podcastsList = (res.data || []).map((sub: any) => sub.podcastId).filter(Boolean);
      this.podcasts.set(podcastsList);
    } catch (e) {
      console.error('Error loading podcasts:', e);
    } finally {
      this.loading.set(false);
    }
  }

  async addPodcast() {
    if (!this.podcastUrl.trim()) return;
    this.adding.set(true);
    this.addError.set('');
    try {
      await this.api.subscribeToPodcast(this.podcastUrl.trim());
      this.showAddModal.set(false);
      this.podcastUrl = '';
      await this.loadPodcasts();
    } catch (e: any) {
      this.addError.set(e?.error?.message || 'Error al añadir podcast');
    } finally {
      this.adding.set(false);
    }
  }

  confirmDelete(podcast: any): void {
    this.podcastToDelete.set(podcast);
  }

  cancelDelete(): void {
    this.podcastToDelete.set(null);
  }

  async deletePodcast(): Promise<void> {
    const podcast = this.podcastToDelete();
    if (!podcast) return;

    this.deleting.set(true);
    try {
      await this.api.removeSubscription(podcast._id);

      // Animate removal
      this.podcastToDelete.set(null);
      this.removingId.set(podcast._id);

      // Wait for animation then remove from list
      setTimeout(() => {
        this.podcasts.update(list => list.filter(p => p._id !== podcast._id));
        this.removingId.set('');
        // Auto exit edit mode if no podcasts left
        if (this.podcasts().length === 0) {
          this.editMode.set(false);
        }
      }, 300);
    } catch (e: any) {
      console.error('Error deleting podcast:', e);
    } finally {
      this.deleting.set(false);
    }
  }
}
