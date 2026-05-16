import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface SyncConfig {
  userId?: string;
  targetUsbSerial: string;
  targetFolder: string;
  syncInterval: number;
  lastSyncAt?: Date;
}

@Component({
  selector: 'app-desktop-sync',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './desktop-sync.component.html',
  styleUrls: ['./desktop-sync.component.css']
})
export class DesktopSyncComponent implements OnInit {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/library';

  syncConfig = signal<SyncConfig | null>(null);
  pairingCode = signal<string | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  isEditing = signal<boolean>(false);

  // Edit fields
  editSerial = signal<string>('');
  editFolder = signal<string>('');

  intervals = [
    { label: '30 segundos', value: 30 },
    { label: '1 minuto', value: 60 },
    { label: '5 minutos', value: 300 },
    { label: '15 minutos', value: 900 },
    { label: '1 hora', value: 3600 }
  ];

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.loading.set(true);
    this.http.get<SyncConfig>(`${this.API_URL}/sync-config`).subscribe({
      next: (config) => {
        this.syncConfig.set(config);
        this.editSerial.set(config.targetUsbSerial);
        this.editFolder.set(config.targetFolder);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private pairingCheckInterval?: any;

  generatePairingCode() {
    this.pairingCode.set(null);
    this.http.post<{code: string}>(`${this.API_URL}/pair/generate`, {}).subscribe({
      next: (res) => {
        this.pairingCode.set(res.code);
        this.startPairingCheck();
      },
      error: (err) => alert('Error al generar el código')
    });
  }

  private startPairingCheck() {
    if (this.pairingCheckInterval) clearInterval(this.pairingCheckInterval);
    
    // Check every 2 seconds if config has been updated (paired)
    this.pairingCheckInterval = setInterval(() => {
      this.http.get<any>(`${this.API_URL}/sync-config`).subscribe({
        next: (res) => {
          const config = res.data || res;
          if (config && config.userId) {
            this.syncConfig.set(config);
            if (this.pairingCode()) {
              this.pairingCode.set(null);
              clearInterval(this.pairingCheckInterval);
            }
          }
        }
      });
    }, 2000);

    // Auto-stop after 10 mins
    setTimeout(() => clearInterval(this.pairingCheckInterval), 10 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.pairingCheckInterval) clearInterval(this.pairingCheckInterval);
  }

  toggleEdit() {
    const config = this.syncConfig();
    if (this.isEditing() && config) {
      // Cancel: Restore values
      this.editSerial.set(config.targetUsbSerial);
      this.editFolder.set(config.targetFolder);
    }
    this.isEditing.set(!this.isEditing());
  }

  saveConfig() {
    const current = this.syncConfig();
    if (!current) return;

    this.saving.set(true);
    const payload = {
      targetUsbSerial: this.editSerial(),
      targetFolder: this.editFolder(),
      syncInterval: current.syncInterval || 60
    };

    this.http.post<SyncConfig>(`${this.API_URL}/sync-config`, payload).subscribe({
      next: (newConfig) => {
        this.syncConfig.set(newConfig);
        this.saving.set(false);
        this.isEditing.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  updateInterval(seconds: number) {
    const config = this.syncConfig();
    if (!config || this.saving()) return;

    this.saving.set(true);
    // Send full object to ensure consistency, use default empty strings if needed
    const payload = {
      targetUsbSerial: config.targetUsbSerial || '',
      targetFolder: config.targetFolder || 'Podcasts',
      syncInterval: seconds
    };

    this.http.post<SyncConfig>(`${this.API_URL}/sync-config`, payload).subscribe({
      next: (newConfig) => {
        this.syncConfig.set(newConfig);
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Error updating interval', err);
        this.saving.set(false);
      }
    });
  }

  getIntervalLabel(seconds: number): string {
    return this.intervals.find(i => i.value === seconds)?.label || `${seconds}s`;
  }
}
