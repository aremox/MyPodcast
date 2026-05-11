import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-search',
  imports: [FormsModule],
  template: `
    <div class="page container animate-fade-in">
      <h1 class="page-title">Buscar en iVoox</h1>
      <div class="search-bar">
        <input type="text" [(ngModel)]="query" placeholder="Buscar podcasts..." (keydown.enter)="search()" />
        <button class="btn-search" (click)="search()" [disabled]="searching()">
          {{ searching() ? '...' : '🔍' }}
        </button>
      </div>

      @if (searching()) {
        <div class="loading-dots"><span></span><span></span><span></span></div>
      }

      @if (!searching() && searched() && results().length === 0) {
        <div class="empty"><p>Sin resultados para "{{ lastQuery() }}"</p></div>
      }

      @if (results().length > 0) {
        <div class="results">
          @for (r of results(); track r.url) {
            <div class="result-item">
              @if (r.imageUrl) {
                <img [src]="r.imageUrl" class="result-img" />
              } @else {
                <div class="result-img placeholder">🎙️</div>
              }
              <div class="result-info">
                <span class="r-title">{{ r.title }}</span>
                @if (r.author) { <span class="r-author">{{ r.author }}</span> }
              </div>
              <button
                class="btn-add-sm"
                [class.added]="addedUrls().has(r.url)"
                [disabled]="addingUrl() === r.url || addedUrls().has(r.url)"
                (click)="subscribe(r.url)">
                @if (addingUrl() === r.url) {
                  ...
                } @else if (addedUrls().has(r.url)) {
                  ✓ Añadido
                } @else {
                  + Añadir
                }
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding: var(--space-xl) var(--space-lg); padding-bottom: var(--space-3xl); }
    .page-title { font-family: var(--font-display); font-size: var(--font-3xl); font-weight: 800; margin-bottom: var(--space-lg); }
    .search-bar { display: flex; gap: var(--space-md); }
    .search-bar input { flex: 1; height: var(--touch-comfortable); }
    .btn-search {
      padding: 0 var(--space-xl); background: var(--accent); color: var(--bg-primary);
      font-weight: 600; border-radius: var(--radius-md); min-height: var(--touch-comfortable);
      font-size: var(--font-lg); transition: opacity var(--transition-fast);
    }
    .btn-search:disabled { opacity: 0.5; }

    .loading-dots { display: flex; justify-content: center; gap: 6px; padding: var(--space-xl); }
    .loading-dots span {
      width: 10px; height: 10px; border-radius: 50%; background: var(--accent);
      animation: bounce 1s ease infinite;
    }
    .loading-dots span:nth-child(2) { animation-delay: 0.15s; }
    .loading-dots span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-8px); opacity: 1; } }

    .empty { text-align: center; padding: var(--space-3xl); color: var(--text-muted); }

    .results { margin-top: var(--space-lg); display: flex; flex-direction: column; gap: 4px; }
    .result-item {
      display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md);
      border-radius: var(--radius-md); min-height: var(--touch-comfortable);
      transition: background var(--transition-fast);
    }
    .result-item:hover { background: rgba(255,255,255,0.04); }

    .result-img {
      width: 56px; height: 56px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0;
    }
    .result-img.placeholder {
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06); font-size: 1.5rem;
    }

    .result-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .r-title { font-weight: 600; font-size: var(--font-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .r-author { font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px; }

    .btn-add-sm {
      padding: var(--space-sm) var(--space-lg); background: var(--accent-dim); color: var(--accent);
      border-radius: var(--radius-full); font-size: var(--font-sm); font-weight: 600;
      white-space: nowrap; min-height: var(--touch-min); transition: all var(--transition-fast);
    }
    .btn-add-sm:hover:not(:disabled) { background: var(--accent); color: var(--bg-primary); }
    .btn-add-sm.added { background: rgba(16,185,129,0.15); color: var(--success); }
    .btn-add-sm:disabled { opacity: 0.7; cursor: default; }
  `,
})
export class SearchComponent {
  query = '';
  results = signal<any[]>([]);
  searching = signal(false);
  searched = signal(false);
  lastQuery = signal('');
  addingUrl = signal<string | null>(null);
  addedUrls = signal(new Set<string>());

  constructor(private api: ApiService, private router: Router) {}

  async search() {
    if (!this.query.trim()) return;
    this.searching.set(true);
    this.searched.set(false);
    this.lastQuery.set(this.query.trim());
    try {
      const r = await this.api.searchIvoox(this.query);
      this.results.set(r.data || []);
    } finally {
      this.searching.set(false);
      this.searched.set(true);
    }
  }

  async subscribe(url: string) {
    this.addingUrl.set(url);
    try {
      await this.api.subscribeToPodcast(url);
      this.addedUrls.update(s => { const n = new Set(s); n.add(url); return n; });
    } catch {
    } finally {
      this.addingUrl.set(null);
    }
  }
}
