import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-desktop-sync',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './desktop-sync.component.html',
  styleUrls: ['./desktop-sync.component.css']
})
export class DesktopSyncComponent implements OnInit {
  private http = inject(HttpClient);
  // Using relative path to match the rest of the app's architecture
  private readonly API_URL = '/api/library';

  syncConfig = signal<any>(null);
  pairingCode = signal<string | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);

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
    this.http.get(`${this.API_URL}/sync-config`).subscribe({
      next: (config) => {
        this.syncConfig.set(config);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  generatePairingCode() {
    this.http.post(`${this.API_URL}/pair/generate`, {}).subscribe({
      next: (res: any) => this.pairingCode.set(res.code),
      error: (err) => console.error('Error generating code', err)
    });
  }

  updateInterval(seconds: number) {
    this.saving.set(true);
    const config = this.syncConfig();
    this.http.post(`${this.API_URL}/sync-config`, {
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
