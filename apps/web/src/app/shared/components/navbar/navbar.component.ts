import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { PlaylistService } from '../../../core/services/playlist.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  },
  template: `
    <nav class="navbar">
      <div class="nav-brand">
        <a routerLink="/library" class="brand" (click)="onBrandClick($event)">
          <span class="brand-icon" [class.rotate-active]="showVersion()">🎧</span>
          <span class="brand-text">MyPodcast</span>
          <span class="tesla-mode-icon" title="Modo Tesla Activado">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M12 18v-4"/>
              <path d="M8 14h8"/>
            </svg>
          </span>
        </a>
        <div 
          class="version-subtext" 
          [class.is-visible]="showVersion()" 
          [title]="fullUserAgent"
          (click)="toggleTeslaMode($event)"
        >
          v1.13.9-stable | {{ teslaStatus }}
        </div>
      </div>

      <button class="menu-toggle" (click)="mobileMenuOpen.set(!mobileMenuOpen())" [attr.aria-expanded]="mobileMenuOpen()">
        @if (mobileMenuOpen()) {
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        } @else {
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        }
      </button>

      <div class="nav-content" [class.is-open]="mobileMenuOpen()">
        <div class="nav-links">
          <a routerLink="/library" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link" (click)="mobileMenuOpen.set(false)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Inicio</span>
          </a>
          <a routerLink="/search" routerLinkActive="active" class="nav-link" (click)="mobileMenuOpen.set(false)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <span>Buscar</span>
          </a>
          <a routerLink="/playlist" routerLinkActive="active" class="nav-link nav-link-playlist" (click)="mobileMenuOpen.set(false)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <polygon points="3 6 3 18 5.5 12" fill="currentColor" stroke="none"/>
            </svg>
            <span>Cola</span>
            @if (pl.count() > 0) {
              <span class="queue-badge">{{ pl.count() }}</span>
            }
          </a>

          <a routerLink="/downloads" routerLinkActive="active" class="nav-link" (click)="mobileMenuOpen.set(false)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Descargas</span>
          </a>
          <a routerLink="/history" routerLinkActive="active" class="nav-link" (click)="mobileMenuOpen.set(false)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Historial</span>
          </a>
          
          @if (auth.isAdmin()) {
            <div class="admin-dropdown-container">
              <button class="nav-link admin-btn" (click)="adminMenuOpen.set(!adminMenuOpen())" [class.active]="isAdminRouteActive()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span>Admin</span>
                <svg class="dropdown-chevron" [class.open]="adminMenuOpen()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              
              <div class="admin-dropdown-menu" [class.is-open]="adminMenuOpen()">
                <a routerLink="/desktop-sync" routerLinkActive="active" class="dropdown-item" (click)="closeAdminMenu()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    <rect x="4" y="16" width="16" height="4" rx="1"/>
                  </svg>
                  <span>Sync USB</span>
                </a>
                <a routerLink="/users" routerLinkActive="active" class="dropdown-item" (click)="closeAdminMenu()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>Usuarios</span>
                </a>
              </div>
            </div>
          }
        </div>
        <div class="nav-user">
          <span class="username">{{ auth.user()?.username }}</span>
          <button class="btn-logout" (click)="auth.logout()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span class="logout-text">Salir</span>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: `
    .nav-brand {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      position: relative;
    }
    .brand-icon {
      font-size: 1.5rem;
      transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: inline-block;
    }
    .brand-icon.rotate-active {
      transform: rotate(360deg);
    }
    .version-subtext {
      font-size: 9px;
      font-family: monospace;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      opacity: 1;
      transform: none;
      height: auto;
      margin-top: 2px;
      user-select: none;
    }
    .version-subtext:hover {
      color: var(--accent);
    }

    /* On mobile/medium screens (< 1280px), hide by default and show on click with 3D rotation flip */
    @media (max-width: 1279px) {
      .version-subtext {
        opacity: 0;
        transform: translateY(-6px) rotateX(-90deg);
        height: 0;
        margin-top: 0;
        pointer-events: none;
        transform-origin: top center;
      }
      .version-subtext.is-visible {
        opacity: 1;
        transform: translateY(0) rotateX(0);
        height: 12px;
        margin-top: 2px;
        pointer-events: auto;
      }
    }

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
      flex-shrink: 0;
    }
    .brand:hover { color: var(--accent); }

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      margin-left: 0;
      min-width: 0;
    }

    .tesla-mode-icon {
      display: none;
      color: var(--accent);
      background: rgba(0, 212, 170, 0.1);
      padding: 4px;
      border-radius: var(--radius-sm);
    }

    .nav-links {
      display: flex;
      gap: var(--space-xs);
      flex-wrap: nowrap;
      align-items: center;
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
      position: relative;
      white-space: nowrap;
    }
    .nav-link:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.05);
    }
    .nav-link.active {
      color: var(--accent);
      background: var(--accent-dim);
    }

    /* Admin Dropdown Styles */
    .admin-dropdown-container {
      position: relative;
    }
    .admin-btn {
      background: none;
      border: none;
      cursor: pointer;
      width: 100%;
      text-align: left;
    }
    .dropdown-chevron {
      transition: transform var(--transition-fast);
      margin-left: 4px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .dropdown-chevron.open {
      transform: rotate(180deg);
    }
    .admin-dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px);
      border-radius: var(--radius-lg);
      padding: 6px;
      min-width: 170px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all var(--transition-normal) cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--shadow-xl);
      z-index: 60;
    }
    .admin-dropdown-menu.is-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      font-weight: 500;
      transition: all var(--transition-fast);
      white-space: nowrap;
      cursor: pointer;
    }
    .dropdown-item:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.05);
    }
    .dropdown-item.active {
      color: var(--accent);
      background: var(--accent-dim);
    }

    /* Playlist link — subtle gradient pulse when queue not empty */
    .nav-link-playlist.active { color: var(--accent); }
    .queue-badge {
      display: flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px; padding: 0 4px;
      background: var(--accent); color: var(--bg-primary);
      border-radius: var(--radius-full);
      font-size: 10px; font-weight: 700;
      animation: badgePop 0.3s var(--transition-spring) both;
    }
    @keyframes badgePop {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .nav-user {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      flex-shrink: 0;
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
    .logout-text { display: none; }

    .menu-toggle {
      display: none;
      color: var(--text-primary);
      background: none;
      border: none;
      padding: var(--space-sm);
      cursor: pointer;
    }

    /* ── Tesla / tablet medium (900–1279px): icon-only nav to prevent overlap ── */
    @media (min-width: 769px) and (max-width: 1279px) {
      .navbar {
        height: 76px;
        padding: 0 var(--space-xl);
      }
      .brand-text { font-size: var(--font-lg); }
      .nav-links {
        gap: 4px;
      }
      .nav-link {
        /* Show only icon, label hidden — prevents collision on Tesla 1200px wide */
        padding: 14px;
        border-radius: var(--radius-lg);
        min-height: 52px;
        min-width: 52px;
        justify-content: center;
        gap: 0;
      }
      .nav-link span:not(.queue-badge) {
        display: none;
      }
      .nav-link svg {
        width: 24px;
        height: 24px;
      }
      .dropdown-chevron {
        display: none !important;
      }
      .queue-badge {
        position: absolute;
        top: 6px;
        right: 6px;
        min-width: 20px;
        height: 20px;
        font-size: 11px;
      }
      .username { display: none; }
      .btn-logout {
        width: 52px;
        height: 52px;
      }
      .btn-logout svg {
        width: 22px;
        height: 22px;
      }
      .tesla-mode-icon {
        display: flex;
      }
    }

    /* ── Tesla large (1280px+): show labels but bigger targets ── */
    @media (min-width: 1280px) and (max-width: 1600px) {
      .navbar { height: 72px; }
      .nav-link {
        padding: 10px 14px;
        min-height: 48px;
        font-size: var(--font-sm);
      }
      .nav-link svg { width: 22px; height: 22px; }
      .btn-logout { width: 44px; height: 44px; }
      .tesla-mode-icon { display: flex; }
    }

    /* Mobile Responsive Styles */
    @media (max-width: 768px) {
      .menu-toggle {
        display: block;
      }
      .nav-user { position: static; }
      .nav-content {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        position: absolute;
        top: 64px;
        left: 0;
        right: 0;
        background: var(--bg-secondary);
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding: var(--space-md);
        margin-left: 0;
        gap: var(--space-md);
        transform: translateY(-150%);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: var(--shadow-xl);
      }
      .nav-content.is-open {
        transform: translateY(0);
        opacity: 1;
        visibility: visible;
      }
      .nav-links {
        flex-direction: column;
        width: 100%;
      }
      .nav-link {
        width: 100%;
        padding: var(--space-md);
        border-radius: var(--radius-md);
        min-height: 52px;
        font-size: var(--font-md);
      }
      .nav-link svg { width: 22px; height: 22px; }
      .nav-user {
        position: static;
        width: 100%;
        justify-content: space-between;
        padding: var(--space-md);
        border-top: 1px solid rgba(255,255,255,0.05);
      }
      .btn-logout {
        width: auto;
        padding: 0 var(--space-md);
        gap: var(--space-sm);
        background: rgba(255,255,255,0.05);
      }
      .logout-text { display: inline; }

      /* Mobile Dropdown styling */
      .admin-dropdown-container {
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      .admin-dropdown-menu {
        position: relative;
        top: 0;
        right: 0;
        width: 100%;
        background: rgba(0, 0, 0, 0.15);
        border: none;
        border-radius: var(--radius-md);
        margin-top: 4px;
        padding: 4px;
        box-shadow: none;
        opacity: 1;
        visibility: visible;
        transform: none;
        display: none;
      }
      .admin-dropdown-menu.is-open {
        display: flex;
      }
      .dropdown-item {
        width: 100%;
        padding: var(--space-md);
        font-size: var(--font-md);
      }
    }
  `,
})
export class NavbarComponent {
  mobileMenuOpen = signal(false);
  adminMenuOpen = signal(false);
  showVersion = signal(false);

  private router = inject(Router);

  constructor(public auth: AuthService, public pl: PlaylistService) {}

  onBrandClick(event: MouseEvent): void {
    this.mobileMenuOpen.set(false);
    // On small/medium screens, toggle the version display instead of navigating
    if (window.innerWidth < 1279) {
      event.preventDefault();
      this.showVersion.update(v => !v);
    } else {
      // Toggle it but allow navigation
      this.showVersion.update(v => !v);
    }
  }

  get teslaStatus(): string {
    if (typeof navigator === 'undefined') return 'Tesla: N/D';
    const ua = navigator.userAgent || '';
    const autoTesla = /Tesla/i.test(ua) || /TeslaBrowser/i.test(ua);
    const forcedTesla = typeof localStorage !== 'undefined' && localStorage.getItem('forcedTeslaMode') === 'true';
    if (forcedTesla) {
      return 'Tesla: SÍ (Forzado)';
    }
    return `Tesla: ${autoTesla ? 'SÍ (Auto)' : 'NO'}`;
  }

  get fullUserAgent(): string {
    if (typeof navigator === 'undefined') return 'Entorno sin navigator';
    return `${navigator.userAgent} (Haz clic para alternar forzado de Modo Tesla)`;
  }

  toggleTeslaMode(event: MouseEvent): void {
    event.stopPropagation();
    if (typeof localStorage === 'undefined') return;
    const current = localStorage.getItem('forcedTeslaMode') === 'true';
    if (current) {
      localStorage.removeItem('forcedTeslaMode');
      alert('Modo Tesla forzado desactivado. Recargando...');
    } else {
      localStorage.setItem('forcedTeslaMode', 'true');
      alert('Modo Tesla forzado activado. Recargando para aplicar cambios...');
    }
    window.location.reload();
  }

  isAdminRouteActive(): boolean {
    return this.router.url.includes('/users') || this.router.url.includes('/desktop-sync');
  }

  closeAdminMenu(): void {
    this.adminMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.admin-dropdown-container')) {
      this.adminMenuOpen.set(false);
    }
  }
}
