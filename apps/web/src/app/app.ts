import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MiniPlayerComponent } from './shared/components/mini-player/mini-player.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MiniPlayerComponent, NavbarComponent],
  template: `
    @if (auth.isLoggedIn()) {
      <app-navbar />
    }
    <main class="app-main" [class.has-player]="auth.isLoggedIn()">
      <router-outlet />
    </main>
    @if (auth.isLoggedIn()) {
      <app-mini-player />
    }
    
    <div 
      class="version-watermark" 
      [class.has-player]="auth.isLoggedIn()" 
      [title]="fullUserAgent"
      (click)="toggleTeslaMode()"
    >
      v1.13.8-stable | {{ teslaStatus }}
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .app-main {
      flex: 1;
      padding-bottom: 0;
    }
    .app-main.has-player {
      padding-bottom: 130px;
    }
    .version-watermark {
      position: fixed;
      bottom: 8px;
      left: 8px;
      z-index: 10000;
      font-size: 10px;
      font-family: monospace;
      color: rgba(255, 255, 255, 0.4);
      background: rgba(0, 0, 0, 0.65);
      padding: 4px 8px;
      border-radius: 4px;
      pointer-events: auto;
      cursor: pointer;
      max-width: 265px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(4px);
    }
    .version-watermark.has-player {
      bottom: 106px;
    }
    .version-watermark:hover {
      max-width: 600px;
      white-space: normal;
      color: rgba(255, 255, 255, 0.9);
      background: rgba(10, 10, 20, 0.95);
      border-color: rgba(0, 212, 170, 0.4);
      box-shadow: 0 0 10px rgba(0, 212, 170, 0.2);
    }
  `,
})
export class App {
  constructor(public auth: AuthService) {}

  get fullUserAgent(): string {
    if (typeof navigator === 'undefined') return 'Entorno sin navigator';
    return `${navigator.userAgent} (Haz clic para alternar forzado de Modo Tesla)`;
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

  toggleTeslaMode(): void {
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
}

