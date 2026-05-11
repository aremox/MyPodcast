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
      padding-bottom: 90px;
    }
  `,
})
export class App {
  constructor(public auth: AuthService) {}
}
