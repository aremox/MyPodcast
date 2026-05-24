import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface User {
  _id: string;
  email: string;
  username: string;
  role: 'administrador' | 'usuario' | 'bloqueado';
  createdAt: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users-dashboard container animate-fade-in-up">
      <header class="dashboard-header">
        <div class="header-info">
          <h1>Gestión de Usuarios</h1>
          <p class="subtitle">Administra los accesos, roles y el estado de aceptación de los usuarios del sistema.</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Total Usuarios</span>
            <span class="stat-value">{{ users().length }}</span>
          </div>
          <div class="stat-card stat-accent">
            <span class="stat-label">Usuarios Activos</span>
            <span class="stat-value">{{ getActiveCount() }}</span>
          </div>
          <div class="stat-card stat-warn" [class.has-pending]="getPendingCount() > 0">
            <span class="stat-label">Pendientes / Bloqueados</span>
            <span class="stat-value">{{ getPendingCount() }}</span>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando lista de usuarios...</p>
        </div>
      } @else {
        <div class="table-container">
          <!-- Desktop Table -->
          <table class="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol / Estado</th>
                <th>Fecha de Registro</th>
                <th class="actions-col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user._id) {
                <tr class="user-row">
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar">{{ user.username.substring(0,2).toUpperCase() }}</div>
                      <span class="user-name">{{ user.username }}</span>
                    </div>
                  </td>
                  <td>{{ user.email }}</td>
                  <td>
                    <select
                      [ngModel]="user.role"
                      (ngModelChange)="updateUserRole(user._id, $event)"
                      class="role-select"
                      [class.role-admin]="user.role === 'administrador'"
                      [class.role-user]="user.role === 'usuario'"
                      [class.role-blocked]="user.role === 'bloqueado'"
                    >
                      <option value="administrador">Administrador</option>
                      <option value="usuario">Usuario</option>
                      <option value="bloqueado">Bloqueado / Pendiente</option>
                    </select>
                  </td>
                  <td>{{ user.createdAt | date:'dd MMM yyyy, HH:mm' }}</td>
                  <td class="actions-col">
                    <button (click)="confirmDelete(user)" class="btn-delete" title="Eliminar Usuario">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Mobile Cards -->
          <div class="users-mobile-grid">
            @for (user of users(); track user._id) {
              <div class="mobile-user-card" [class.border-blocked]="user.role === 'bloqueado'">
                <div class="card-header">
                  <div class="user-cell">
                    <div class="user-avatar">{{ user.username.substring(0,2).toUpperCase() }}</div>
                    <div>
                      <span class="user-name">{{ user.username }}</span>
                      <span class="card-date">{{ user.createdAt | date:'dd MMM yyyy' }}</span>
                    </div>
                  </div>
                  <button (click)="confirmDelete(user)" class="btn-delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    </svg>
                  </button>
                </div>
                <div class="card-body">
                  <div class="card-field">
                    <span class="field-label">Email:</span>
                    <span class="field-value">{{ user.email }}</span>
                  </div>
                  <div class="card-field">
                    <span class="field-label">Rol:</span>
                    <select
                      [ngModel]="user.role"
                      (ngModelChange)="updateUserRole(user._id, $event)"
                      class="role-select w-100"
                      [class.role-admin]="user.role === 'administrador'"
                      [class.role-user]="user.role === 'usuario'"
                      [class.role-blocked]="user.role === 'bloqueado'"
                    >
                      <option value="administrador">Administrador</option>
                      <option value="usuario">Usuario</option>
                      <option value="bloqueado">Bloqueado / Pendiente</option>
                    </select>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (userToDelete()) {
        <div class="modal-backdrop" (click)="userToDelete.set(null)">
          <div class="confirm-modal animate-fade-in" (click)="$event.stopPropagation()">
            <h2>¿Eliminar usuario?</h2>
            <p>¿Estás seguro de que deseas eliminar a <strong>{{ userToDelete()?.username }}</strong>? Esta acción no se puede deshacer y revocará todo su acceso al sistema.</p>
            <div class="modal-actions">
              <button (click)="userToDelete.set(null)" class="btn-cancel">Cancelar</button>
              <button (click)="deleteUser()" class="btn-confirm-delete">Eliminar Permanentemente</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .users-dashboard {
      padding: var(--space-xl) 0;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-lg);
      margin-bottom: var(--space-2xl);
    }
    .header-info h1 {
      font-family: var(--font-display);
      font-size: var(--font-3xl);
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: var(--space-xs);
    }
    .subtitle {
      color: var(--text-secondary);
      font-size: var(--font-md);
      max-width: 600px;
    }
    .stats-grid {
      display: flex;
      gap: var(--space-md);
    }
    .stat-card {
      background: var(--bg-secondary);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: var(--radius-lg);
      padding: var(--space-md) var(--space-lg);
      display: flex;
      flex-direction: column;
      min-width: 140px;
      transition: all var(--transition-normal);
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255,255,255,0.1);
    }
    .stat-label {
      font-size: var(--font-xs);
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-xs);
    }
    .stat-value {
      font-size: var(--font-2xl);
      font-weight: 800;
      font-family: var(--font-display);
    }
    .stat-accent .stat-value {
      color: var(--accent);
    }
    .stat-warn .stat-value {
      color: var(--text-muted);
    }
    .stat-warn.has-pending {
      border-color: rgba(239, 68, 68, 0.2);
      background: rgba(239, 68, 68, 0.02);
    }
    .stat-warn.has-pending .stat-value {
      color: var(--error);
      text-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
    }

    .table-container {
      background: var(--bg-secondary);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-lg);
    }
    .users-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .users-table th {
      background: rgba(255,255,255,0.02);
      padding: var(--space-md) var(--space-lg);
      color: var(--text-muted);
      font-size: var(--font-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .users-table td {
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid rgba(255,255,255,0.03);
      color: var(--text-secondary);
      font-size: var(--font-sm);
    }
    .user-row {
      transition: background-color var(--transition-fast);
    }
    .user-row:hover {
      background: rgba(255,255,255,0.01);
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background: var(--accent-dim);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-xs);
      font-weight: 700;
      border: 1px solid rgba(0, 212, 170, 0.2);
    }
    .user-name {
      color: var(--text-primary);
      font-weight: 600;
    }

    /* Custom Role Selector Styling */
    .role-select {
      background: var(--bg-input);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      font-size: var(--font-xs);
      font-weight: 600;
      color: var(--text-primary);
      outline: none;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .role-select:focus {
      border-color: var(--accent);
    }
    .role-select.role-admin {
      color: var(--accent);
      background: rgba(0, 212, 170, 0.1);
      border-color: rgba(0, 212, 170, 0.2);
    }
    .role-select.role-user {
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.2);
    }
    .role-select.role-blocked {
      color: var(--error);
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
    }
    .actions-col {
      text-align: right;
      width: 100px;
    }
    .btn-delete {
      color: var(--text-muted);
      padding: 8px;
      border-radius: var(--radius-full);
      transition: all var(--transition-fast);
    }
    .btn-delete:hover {
      color: var(--error);
      background: rgba(239, 68, 68, 0.1);
    }

    .loading-state {
      padding: var(--space-3xl) 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-md);
      color: var(--text-secondary);
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(0, 212, 170, 0.1);
      border-radius: 50%;
      border-top-color: var(--accent);
      animation: spin 1s linear infinite;
    }

    /* Mobile Responsive view */
    .users-mobile-grid {
      display: none;
    }

    /* Confirmation Modal */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(8px);
      z-index: var(--z-modal);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-md);
    }
    .confirm-modal {
      background: var(--bg-secondary);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      max-width: 450px;
      width: 100%;
      box-shadow: var(--shadow-xl);
    }
    .confirm-modal h2 {
      font-family: var(--font-display);
      font-size: var(--font-lg);
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: var(--space-sm);
    }
    .confirm-modal p {
      color: var(--text-secondary);
      font-size: var(--font-sm);
      margin-bottom: var(--space-xl);
      line-height: 1.5;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
    }
    .btn-cancel {
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-full);
      color: var(--text-primary);
      background: rgba(255,255,255,0.05);
      font-weight: 600;
      font-size: var(--font-xs);
      transition: background var(--transition-fast);
    }
    .btn-cancel:hover {
      background: rgba(255,255,255,0.1);
    }
    .btn-confirm-delete {
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-full);
      color: #fff;
      background: var(--error);
      font-weight: 600;
      font-size: var(--font-xs);
      transition: background var(--transition-fast);
    }
    .btn-confirm-delete:hover {
      background: #dc2626;
    }

    @media (max-width: 900px) {
      .dashboard-header {
        flex-direction: column;
        align-items: stretch;
      }
      .stats-grid {
        justify-content: space-between;
      }
      .stat-card {
        flex: 1;
        min-width: 0;
      }
    }

    @media (max-width: 768px) {
      .users-table {
        display: none;
      }
      .table-container {
        background: transparent;
        border: none;
        box-shadow: none;
      }
      .users-mobile-grid {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }
      .mobile-user-card {
        background: var(--bg-secondary);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: var(--radius-md);
        padding: var(--space-md);
      }
      .mobile-user-card.border-blocked {
        border-left: 3px solid var(--error);
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding-bottom: var(--space-sm);
        margin-bottom: var(--space-sm);
      }
      .card-date {
        display: block;
        font-size: var(--font-xs);
        color: var(--text-muted);
        margin-top: 2px;
      }
      .card-body {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
      }
      .card-field {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: var(--font-sm);
      }
      .field-label {
        color: var(--text-muted);
        font-weight: 500;
      }
      .field-value {
        color: var(--text-primary);
        font-weight: 600;
        word-break: break-all;
      }
      .w-100 {
        width: 150px;
      }
    }
  `,
})
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  
  users = signal<User[]>([]);
  loading = signal<boolean>(true);
  userToDelete = signal<User | null>(null);

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.loading.set(true);
    this.http.get<User[]>('/api/users').subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.loading.set(false);
      },
    });
  }

  updateUserRole(userId: string, newRole: string) {
    this.http.put<User>(`/api/users/${userId}/role`, { role: newRole }).subscribe({
      next: (updatedUser) => {
        this.users.update((list) =>
          list.map((u) => (u._id === userId ? { ...u, role: updatedUser.role } : u))
        );
      },
      error: (err) => {
        console.error('Error updating user role:', err);
      },
    });
  }

  confirmDelete(user: User) {
    this.userToDelete.set(user);
  }

  deleteUser() {
    const user = this.userToDelete();
    if (!user) return;

    this.http.delete(`/api/users/${user._id}`).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u._id !== user._id));
        this.userToDelete.set(null);
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        this.userToDelete.set(null);
      },
    });
  }

  getActiveCount(): number {
    return this.users().filter((u) => u.role !== 'bloqueado').length;
  }

  getPendingCount(): number {
    return this.users().filter((u) => u.role === 'bloqueado').length;
  }
}
