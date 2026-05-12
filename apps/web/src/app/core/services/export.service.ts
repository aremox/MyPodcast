import { Injectable, signal, computed } from '@angular/core';
import { PlayerEpisode } from './audio-player.service';

// Basic Type Definitions for File System Access API
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}
interface FileSystemDirectoryHandle extends FileSystemHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}
interface FileSystemFileHandle extends FileSystemHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}
interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: any) => Promise<FileSystemDirectoryHandle>;
  }
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  isExporting = signal(false);
  totalToExport = signal(0);
  currentExported = signal(0);
  exportError = signal<string | null>(null);
  currentEpisodeName = signal<string>('');

  // Check if browser supports the API
  readonly isSupported = computed(() => typeof window !== 'undefined' && 'showDirectoryPicker' in window);

  /**
   * Main export method
   */
  async exportQueueToUsb(episodes: PlayerEpisode[]): Promise<void> {
    if (!this.isSupported()) {
      this.exportError.set('Tu navegador no soporta la exportación directa a carpetas (File System Access API).');
      return;
    }

    if (episodes.length === 0) {
      return;
    }

    try {
      this.exportError.set(null);
      
      // Request user to select a directory
      const directoryHandle = await window.showDirectoryPicker!({
        mode: 'readwrite',
      });

      this.isExporting.set(true);
      this.totalToExport.set(episodes.length);
      this.currentExported.set(0);

      // Iterate through episodes
      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i];
        
        // Clean filename (remove invalid chars)
        const safeTitle = (episode.title || 'audio').replace(/[/\\?%*:|"<>]/g, '-');
        const safePodcast = (episode.podcastTitle || 'Podcast').replace(/[/\\?%*:|"<>]/g, '-');
        
        // Example: "El Partidazo - Episodio 32.mp3"
        // Prepend index to keep queue order
        const filename = `${String(i + 1).padStart(2, '0')} - ${safePodcast} - ${safeTitle}.mp3`;
        
        this.currentEpisodeName.set(filename);

        // Fetch audio data
        const response = await fetch(episode.audioUrl);
        if (!response.ok) {
          throw new Error(`No se pudo descargar: ${episode.title}`);
        }
        
        if (!response.body) {
          throw new Error(`El servidor no devolvió contenido para: ${episode.title}`);
        }

        // Get file handle and write
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        
        await response.body.pipeTo(writable);

        this.currentExported.set(i + 1);
      }

      // Done
      this.isExporting.set(false);
      this.currentEpisodeName.set('');

    } catch (error: any) {
      console.error('Error during export:', error);
      // If user cancelled directory picker, it throws DOMException "AbortError"
      if (error.name !== 'AbortError') {
        this.exportError.set(error.message || 'Ocurrió un error inesperado al exportar.');
      }
      this.isExporting.set(false);
    }
  }

  cancelExport(): void {
    // In a real advanced implementation, we would abort the fetch using an AbortController.
    // For now, setting isExporting to false will just reset UI, 
    // although the current download might finish in background.
    this.isExporting.set(false);
    this.exportError.set(null);
  }
}
