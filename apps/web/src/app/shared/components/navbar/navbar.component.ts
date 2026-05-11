import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="nav-brand">
        <a routerLink="/library" class="brand">
          <span class="brand-icon">🎧</span>
          <span class="brand-text">MyPodcast</span>
        </a>
      </div>
      <div class="nav-links">
        <a routerLink="/library" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Inicio</span>
        </a>
        <a routerLink="/search" routerLinkActive="active" class="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <span>Buscar</span>
        </a>
        <a routerLink="/favorites" routerLinkActive="active" class="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span>Favoritos</span>
        </a>
        <a routerLink="/downloads" routerLinkActive="active" class="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Descargas</span>
        </a>
        <a routerLink="/history" routerLinkActive="active" class="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Historial</span>
        </a>
      </div>
      <div class="nav-user">
        <span class="username">{{ auth.user()?.username }}</span>
        <button class="btn-logout" (click)="auth.logout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </nav>
  `,
  styles: `
    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-lg);
      height: 64px;
      background: var(--bg-secondary);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(20px);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--text-primary);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--font-xl);
    }
    .brand-icon { font-size: 1.5rem; }
    .brand:hover { color: var(--accent); }

    .nav-links {
      display: flex;
      gap: var(--space-xs);
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      font-weight: 500;
      transition: all var(--transition-fast);
      min-height: var(--touch-min);
    }
    .nav-link:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.05);
    }
    .nav-link.active {
      color: var(--accent);
      background: var(--accent-dim);
    }
    .nav-user {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }
    .username {
      color: var(--text-secondary);
      font-size: var(--font-sm);
    }
    .btn-logout {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      color: var(--text-muted);
      transition: all var(--transition-fast);
    }
    .btn-logout:hover {
      color: var(--error);
      background: rgba(239,68,68,0.1);
    }
  `,
})
export class NavbarComponent {
  constructor(public auth: AuthService) {}
}
