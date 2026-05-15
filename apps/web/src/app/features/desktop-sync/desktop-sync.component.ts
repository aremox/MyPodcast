import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-desktop-sync',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './desktop-sync.component.html',
  styleUrls: ['./desktop-sync.component.scss']
})
export class DesktopSyncComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly AGENT_URL = 'http://127.0.0.1:31415';
  private pollInterval: any;

  isAgentOnline = false;
  isSyncing = false;
  connectedDrives: any[] = [];
  config: any = {
    targetUsbSerial: '',
    targetFolder: 'Podcasts',
    jwtToken: ''
  };

  ngOnInit() {
    this.checkAgentStatus();
    this.pollInterval = setInterval(() => this.checkAgentStatus(), 5000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  checkAgentStatus() {
    this.http.get(`${this.AGENT_URL}/status`).subscribe({
      next: (res: any) => {
        this.isAgentOnline = true;
        this.isSyncing = res.isSyncing;
        this.connectedDrives = res.connectedDrives || [];
        
        // Only override local config if we haven't touched it or if it's empty
        if (!this.config.targetUsbSerial && res.config?.targetUsbSerial) {
          this.config.targetUsbSerial = res.config.targetUsbSerial;
          this.config.targetFolder = res.config.targetFolder || 'Podcasts';
        }
      },
      error: () => {
        this.isAgentOnline = false;
        this.connectedDrives = [];
      }
    });
  }

  saveConfig() {
    this.config.jwtToken = this.auth.token();
    this.http.post(`${this.AGENT_URL}/config`, this.config).subscribe({
      next: () => {
        alert('Configuración guardada en el agente de escritorio.');
        this.checkAgentStatus();
      },
      error: () => {
        alert('Error al conectar con el agente de escritorio.');
      }
    });
  }
}
