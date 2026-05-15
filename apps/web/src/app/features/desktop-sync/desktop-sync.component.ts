import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-desktop-sync',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './desktop-sync.component.html',
  styleUrl: './desktop-sync.component.scss'
})
export class DesktopSyncComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly API_URL = '/api/library/sync-config';
  private readonly AGENT_LOCAL_URL = 'http://localhost:31415';
  private pollInterval: any;

  isAgentOnline = false;
  isSyncing = false;
  connectedDrives: any[] = [];
  pairingCode: string | null = null;
  
  config: any = {
    targetUsbSerial: '',
    targetFolder: 'Podcasts',
  };

  ngOnInit() {
    this.loadConfigFromBackend();
    this.checkAgentLocalStatus();
    this.pollInterval = setInterval(() => this.checkAgentLocalStatus(), 5000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  loadConfigFromBackend() {
    this.http.get<any>(this.API_URL).subscribe({
      next: (res) => {
        if (res.data) {
          this.config.targetUsbSerial = res.data.targetUsbSerial;
          this.config.targetFolder = res.data.targetFolder || 'Podcasts';
        }
      }
    });
  }

  checkAgentLocalStatus() {
    this.http.get(`${this.AGENT_LOCAL_URL}/status`).subscribe({
      next: (res: any) => {
        this.isAgentOnline = true;
        this.isSyncing = res.isSyncing;
        this.connectedDrives = res.connectedDrives || [];
      },
      error: () => {
        this.isAgentOnline = false;
        this.connectedDrives = [];
      }
    });
  }

  saveConfig() {
    this.http.post(this.API_URL, this.config).subscribe({
      next: () => {
        alert('✅ Configuración guardada en tu perfil.');
      },
      error: () => {
        alert('❌ Error al guardar la configuración.');
      }
    });
  }

  generatePairingCode() {
    this.http.post<any>('/api/library/pair/generate', {}).subscribe({
      next: (res) => {
        this.pairingCode = res.code;
      }
    });
  }
}
