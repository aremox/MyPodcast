import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface AuthUser {
  _id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = '/api/auth';
  private state = signal<AuthState>(this.loadFromStorage());

  readonly user = computed(() => this.state().user);
  readonly isLoggedIn = computed(() => !!this.state().accessToken);
  readonly token = computed(() => this.state().accessToken);
  readonly isAdmin = computed(() => this.state().user?.role === 'administrador');

  constructor(private http: HttpClient, private router: Router) {}

  async login(email: string, password: string): Promise<void> {
    const res = await this.http
      .post<any>(this.API_URL + '/login', { email, password })
      .toPromise();
    this.setAuth(res);
  }

  async register(email: string, username: string, password: string): Promise<void> {
    const res = await this.http
      .post<any>(this.API_URL + '/register', { email, username, password })
      .toPromise();
    this.setAuth(res);
  }

  async refreshTokens(): Promise<string | null> {
    const refreshToken = this.state().refreshToken;
    if (!refreshToken) return null;

    try {
      const res = await this.http
        .post<any>(this.API_URL + '/refresh', {}, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
        .toPromise();
      this.state.update(s => ({
        ...s,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      }));
      this.saveToStorage();
      return res.accessToken;
    } catch {
      this.logout();
      return null;
    }
  }

  logout(): void {
    const userId = this.state().user?._id;
    if (userId) {
      this.http.post(this.API_URL + '/logout', { userId }).subscribe();
    }
    this.state.set({ user: null, accessToken: null, refreshToken: null });
    localStorage.removeItem('auth');
    this.router.navigate(['/login']);
  }

  private setAuth(res: any): void {
    this.state.set({
      user: res.user,
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    });
    this.saveToStorage();
  }

  private saveToStorage(): void {
    localStorage.setItem('auth', JSON.stringify(this.state()));
  }

  private loadFromStorage(): AuthState {
    try {
      const stored = localStorage.getItem('auth');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { user: null, accessToken: null, refreshToken: null };
  }
}
