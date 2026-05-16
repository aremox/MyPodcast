import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface SyncConfig {
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

  generatePairingCode() {
    this.http.post<{code: string}>(`${this.API_URL}/pair/generate`, {}).subscribe({
      next: (res) => this.pairingCode.set(res.code),
      error: (err) => console.error('Error generating code', err)
    });
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
      syncInterval: current.syncInterval
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
    if (this.isEditing() || !config) return;

    this.saving.set(true);
    this.http.post<SyncConfig>(`${this.API_URL}/sync-config`, {
      targetUsbSerial: config.targetUsbSerial,
      targetFolder: config.targetFolder,
      syncInterval: seconds
    }).subscribe({
      next: (newConfig) => {
        this.syncConfig.set(newConfig);
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  getIntervalLabel(seconds: number): string {
    return this.intervals.find(i => i.value === seconds)?.label || `${seconds}s`;
  }
}
