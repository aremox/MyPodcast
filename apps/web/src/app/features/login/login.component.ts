import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="brand">
          <span class="brand-icon">🎧</span>
          <h1 class="brand-title">MyPodcast</h1>
          <p class="brand-subtitle">Tu podcast player personal</p>
        </div>

        @if (error()) {
          <div class="error-msg">{{ error() }}</div>
        }

        <form (ngSubmit)="login()" class="form">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" [(ngModel)]="email" name="email" placeholder="tu@email.com" required />
          </div>
          <div class="field">
            <label for="password">Contraseña</label>
            <input id="password" type="password" [(ngModel)]="password" name="password" placeholder="••••••••" required />
          </div>

          <button type="submit" class="btn-primary" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner-small"></span>
            } @else {
              Iniciar sesión
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: `
    .login-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-primary);
      padding: var(--space-lg);
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      background: var(--bg-secondary);
      border-radius: var(--radius-xl);
      padding: var(--space-2xl);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: var(--shadow-lg);
      animation: fadeInUp 0.5s ease;
    }
    .brand {
      text-align: center;
      margin-bottom: var(--space-xl);
    }
    .brand-icon { font-size: 3rem; display: block; margin-bottom: var(--space-sm); }
    .brand-title {
      font-family: var(--font-display);
      font-size: var(--font-3xl);
      font-weight: 800;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .brand-subtitle {
      color: var(--text-muted);
      font-size: var(--font-sm);
      margin-top: var(--space-xs);
    }
    .error-msg {
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      color: var(--error);
      padding: var(--space-md);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      margin-bottom: var(--space-md);
      text-align: center;
    }
    .form { display: flex; flex-direction: column; gap: var(--space-md); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs); }
    .field label {
      font-size: var(--font-sm);
      font-weight: 500;
      color: var(--text-secondary);
    }
    .field input {
      height: var(--touch-comfortable);
      font-size: var(--font-md);
    }
    .btn-primary {
      height: var(--touch-comfortable);
      background: var(--accent-gradient);
      color: var(--bg-primary);
      font-weight: 700;
      font-size: var(--font-md);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: var(--space-sm);
    }
    .btn-primary:hover { background: var(--accent-gradient-hover); transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .spinner-small {
      width: 20px; height: 20px;
      border: 2px solid rgba(0,0,0,0.2);
      border-top-color: var(--bg-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  async login() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/library']);
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }

}
