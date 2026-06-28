import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface SyncConfig {
  userId?: any;
  targetUsbSerial: string;
  targetFolder: string;
  syncInterval: number;
  lastSyncAt?: Date;
  usbTotalSpace?: number;
  usbFreeSpace?: number;
  usbPodcastsSpace?: number;
  usbOtherSpace?: number;
  usbFormat?: string;
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

  formatBytes(bytes: number | undefined): string {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const dm = 1;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  getPercentage(partial: number | undefined, total: number | undefined): number {
    if (!partial || !total) return 0;
    return Math.round((partial / total) * 100);
  }

  isDiskSpaceLow(): boolean {
    const config = this.syncConfig();
    if (!config || !config.usbFreeSpace) return false;
    return config.usbFreeSpace < 1024 * 1024 * 1024; // Less than 1GB
  }

  getUsedSpace(config: SyncConfig | null): number {
    if (!config || !config.usbTotalSpace || !config.usbFreeSpace) return 0;
    return Math.max(0, config.usbTotalSpace - config.usbFreeSpace);
  }

  // State Signals
  syncConfigs = signal<any[]>([]); // List of all sync configurations
  selectedUserId = signal<string | null>(null); // Selected user/device ID
  syncConfig = signal<SyncConfig | null>(null); // Config of selected device
  pairingCode = signal<string | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  isEditing = signal<boolean>(false);

  // Pairing Modal state
  usersList = signal<any[]>([]);
  showPairingModal = signal<boolean>(false);
  selectedPairingUserId = signal<string>('');

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
    this.loadAllConfigs();
  }

  loadAllConfigs() {
    this.loading.set(true);
    this.http.get<any>(`${this.API_URL}/sync-configs`).subscribe({
      next: (res) => {
        this.syncConfigs.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading sync configs', err);
        this.loading.set(false);
      }
    });
  }

  selectDevice(userId: string) {
    this.selectedUserId.set(userId);
    this.loadConfig(userId);
  }

  goBack() {
    this.selectedUserId.set(null);
    this.syncConfig.set(null);
    this.pairingCode.set(null);
    this.isEditing.set(false);
    if (this.pairingCheckInterval) clearInterval(this.pairingCheckInterval);
    this.loadAllConfigs();
  }

  loadConfig(userId?: string) {
    const id = userId || this.selectedUserId();
    if (!id) return;
    this.loading.set(true);
    this.http.get<any>(`${this.API_URL}/sync-config/user/${id}`).subscribe({
      next: (res) => {
        const config = res.data || res;
        this.syncConfig.set(config);
        this.editSerial.set(config.targetUsbSerial || '');
        this.editFolder.set(config.targetFolder || 'Podcasts');
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private pairingCheckInterval?: any;

  generatePairingCode(userId?: string) {
    const targetUserId = userId || this.selectedUserId();
    if (!targetUserId) return;
    this.pairingCode.set(null);
    this.http.post<{code: string}>(`${this.API_URL}/pair/generate/user/${targetUserId}`, {}).subscribe({
      next: (res) => {
        this.pairingCode.set(res.code);
        this.startPairingCheck(targetUserId);
      },
      error: (err) => alert('Error al generar el código')
    });
  }

  private startPairingCheck(userId: string) {
    if (this.pairingCheckInterval) clearInterval(this.pairingCheckInterval);
    
    this.pairingCheckInterval = setInterval(() => {
      this.http.get<any>(`${this.API_URL}/sync-config/user/${userId}`).subscribe({
        next: (res) => {
          const config = res.data || res;
          if (config && config.userId) {
            this.syncConfig.set(config);
            if (this.pairingCode()) {
              this.pairingCode.set(null);
              clearInterval(this.pairingCheckInterval);
              this.showPairingModal.set(false);
              this.loadAllConfigs();
            }
          }
        }
      });
    }, 2000);

    setTimeout(() => clearInterval(this.pairingCheckInterval), 10 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.pairingCheckInterval) clearInterval(this.pairingCheckInterval);
  }

  toggleEdit() {
    const config = this.syncConfig();
    if (this.isEditing() && config) {
      this.editSerial.set(config.targetUsbSerial);
      this.editFolder.set(config.targetFolder);
    }
    this.isEditing.set(!this.isEditing());
  }

  saveConfig() {
    const id = this.selectedUserId();
    const current = this.syncConfig();
    if (!id || !current) return;

    this.saving.set(true);
    const payload = {
      targetUsbSerial: this.editSerial(),
      targetFolder: this.editFolder(),
      syncInterval: current.syncInterval || 60
    };

    this.http.post<SyncConfig>(`${this.API_URL}/sync-config/user/${id}`, payload).subscribe({
      next: (newConfig) => {
        this.syncConfig.set(newConfig);
        this.saving.set(false);
        this.isEditing.set(false);
        this.loadAllConfigs();
      },
      error: () => this.saving.set(false)
    });
  }

  unlinkDevice() {
    const id = this.selectedUserId();
    if (!id) return;
    if (confirm('¿Estás seguro de que quieres desvincular este dispositivo? El agente dejará de sincronizar automáticamente.')) {
      this.saving.set(true);
      this.http.delete<any>(`${this.API_URL}/sync-config/device/user/${id}`).subscribe({
        next: (res) => {
          this.syncConfig.set(res.data);
          this.saving.set(false);
          this.loadAllConfigs();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  updateInterval(seconds: number) {
    const id = this.selectedUserId();
    const config = this.syncConfig();
    if (!id || !config || this.saving()) return;

    this.saving.set(true);
    const payload = {
      targetUsbSerial: config.targetUsbSerial || '',
      targetFolder: config.targetFolder || 'Podcasts',
      syncInterval: seconds
    };

    this.http.post<SyncConfig>(`${this.API_URL}/sync-config/user/${id}`, payload).subscribe({
      next: (newConfig) => {
        this.syncConfig.set(newConfig);
        this.saving.set(false);
        this.loadAllConfigs();
      },
      error: (err) => {
        console.error('Error updating interval', err);
        this.saving.set(false);
      }
    });
  }

  openPairingModal() {
    this.showPairingModal.set(true);
    this.pairingCode.set(null);
    if (this.pairingCheckInterval) clearInterval(this.pairingCheckInterval);
    
    this.http.get<any[]>('/api/users').subscribe({
      next: (users) => {
        this.usersList.set(users || []);
        if (users && users.length > 0) {
          this.selectedPairingUserId.set(users[0]._id);
        }
      },
      error: (err) => console.error('Error loading users', err)
    });
  }

  pairNewDeviceForUser() {
    const userId = this.selectedPairingUserId();
    if (!userId) return;
    this.generatePairingCode(userId);
  }

  getIntervalLabel(seconds: number): string {
    return this.intervals.find(i => i.value === seconds)?.label || `${seconds}s`;
  }
}
