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
        <button class="btn-add" (click)="showAddModal.set(true)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Añadir podcast
        </button>
      </header>

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
            <a [routerLink]="['/podcast', podcast._id]" class="podcast-card" [style.animation-delay]="($index * 50) + 'ms'">
              <div class="card-img-wrapper">
                <img [src]="podcast.imageUrl || '/assets/placeholder.png'" [alt]="podcast.title" class="card-img" loading="lazy" />
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
    </div>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-xl) 0;
    }
    .page-title {
      font-family: var(--font-display);
      font-size: var(--font-3xl);
      font-weight: 800;
    }
    .page-subtitle {
      color: var(--text-muted);
      font-size: var(--font-sm);
      margin-top: var(--space-xs);
    }
    .btn-add {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      background: var(--accent-gradient);
      color: var(--bg-primary);
      font-weight: 600;
      border-radius: var(--radius-full);
      min-height: var(--touch-min);
      transition: all var(--transition-fast);
    }
    .btn-add:hover { transform: translateY(-2px); box-shadow: var(--shadow-glow); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-lg);
      padding-bottom: var(--space-2xl);
    }
    .podcast-card {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-lg);
      background: var(--bg-surface);
      padding: var(--space-md);
      transition: all var(--transition-normal);
      animation: fadeInUp var(--transition-slow) ease both;
      color: var(--text-primary);
    }
    .podcast-card:hover {
      background: var(--bg-card-hover);
      transform: translateY(-4px);
      box-shadow: var(--shadow-md);
    }
    .card-img-wrapper {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      aspect-ratio: 1;
    }
    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .card-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: var(--space-sm) var(--space-md);
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
    }
    .episode-count {
      font-size: var(--font-xs);
      color: var(--text-secondary);
      font-weight: 500;
    }
    .card-title {
      font-size: var(--font-sm);
      font-weight: 600;
      margin-top: var(--space-md);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-author {
      font-size: var(--font-xs);
      color: var(--text-muted);
      margin-top: var(--space-xs);
    }
    .skeleton-card { padding: var(--space-md); }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-3xl) var(--space-lg);
      text-align: center;
    }
    .empty-icon { font-size: 4rem; margin-bottom: var(--space-lg); }
    .empty-state h2 { font-size: var(--font-2xl); font-weight: 700; }
    .empty-state p { color: var(--text-muted); margin: var(--space-sm) 0 var(--space-lg); }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal);
      animation: fadeIn 0.2s ease;
    }
    .modal {
      background: var(--bg-elevated);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      width: 90%;
      max-width: 480px;
      animation: fadeInUp 0.3s ease;
    }
    .modal-title { font-size: var(--font-xl); font-weight: 700; }
    .modal-desc { color: var(--text-muted); font-size: var(--font-sm); margin: var(--space-sm) 0 var(--space-md); }
    .modal-input {
      width: 100%;
      height: var(--touch-comfortable);
      font-size: var(--font-md);
    }
    .error-text { color: var(--error); font-size: var(--font-sm); margin-top: var(--space-sm); }
    .modal-actions {
      display: flex;
      gap: var(--space-md);
      justify-content: flex-end;
      margin-top: var(--space-lg);
    }
    .btn-cancel {
      padding: var(--space-md) var(--space-lg);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      min-height: var(--touch-min);
    }
    .btn-cancel:hover { background: rgba(255,255,255,0.05); }
    .btn-confirm {
      padding: var(--space-md) var(--space-lg);
      background: var(--accent);
      color: var(--bg-primary);
      font-weight: 600;
      border-radius: var(--radius-md);
      min-height: var(--touch-min);
    }
    .btn-confirm:hover { background: var(--accent-hover); }
    .btn-confirm:disabled { opacity: 0.6; }
  `,
})
export class LibraryComponent implements OnInit {
  podcasts = signal<any[]>([]);
  loading = signal(true);
  showAddModal = signal(false);
  podcastUrl = '';
  adding = signal(false);
  addError = signal('');

  constructor(private api: ApiService) {}

  async ngOnInit() {
    await this.loadPodcasts();
  }

  async loadPodcasts() {
    this.loading.set(true);
    try {
      const res = await this.api.getPodcasts();
      this.podcasts.set(res.data || []);
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
}
