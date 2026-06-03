import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE_URL = '/api';

  constructor(private http: HttpClient) {}

  // ===== PODCASTS =====
  getPodcasts() {
    return firstValueFrom(this.http.get<any>(`${this.BASE_URL}/podcasts`));
  }

  getPodcast(id: string) {
    return firstValueFrom(this.http.get<any>(`${this.BASE_URL}/podcasts/${id}`));
  }

  subscribeToPodcast(url: string) {
    return firstValueFrom(this.http.post<any>(`${this.BASE_URL}/podcasts/subscribe`, { url }));
  }

  unsubscribeFromPodcast(id: string) {
    return firstValueFrom(this.http.delete<any>(`${this.BASE_URL}/podcasts/${id}`));
  }

  searchIvoox(query: string) {
    return firstValueFrom(this.http.post<any>(`${this.BASE_URL}/podcasts/search`, { query }));
  }

  refreshPodcast(id: string) {
    return firstValueFrom(this.http.post<any>(`${this.BASE_URL}/podcasts/${id}/refresh`, {}));
  }

  // ===== EPISODES =====
  getEpisodes(podcastId: string, page = 1, limit = 50) {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return firstValueFrom(
      this.http.get<any>(`${this.BASE_URL}/episodes/podcast/${podcastId}`, { params }),
    );
  }

  getEpisode(id: string) {
    return firstValueFrom(this.http.get<any>(`${this.BASE_URL}/episodes/${id}`));
  }

  getRecentEpisodes(limit = 20) {
    const params = new HttpParams().set('limit', limit.toString());
    return firstValueFrom(
      this.http.get<any>(`${this.BASE_URL}/episodes/recent`, { params }),
    );
  }

  // ===== LIBRARY =====
  getSubscriptions() {
    return firstValueFrom(this.http.get<any>(`${this.BASE_URL}/library/subscriptions`));
  }

  addSubscription(podcastId: string) {
    return firstValueFrom(
      this.http.post<any>(`${this.BASE_URL}/library/subscriptions/${podcastId}`, {}),
    );
  }

  markPodcastAsViewed(podcastId: string) {
    return firstValueFrom(
      this.http.post<any>(`${this.BASE_URL}/library/subscriptions/${podcastId}/view`, {}),
    );
  }

  removeSubscription(podcastId: string) {
    return firstValueFrom(
      this.http.delete<any>(`${this.BASE_URL}/library/subscriptions/${podcastId}`),
    );
  }

  getHistory(page = 1, limit = 20) {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return firstValueFrom(
      this.http.get<any>(`${this.BASE_URL}/library/history`, { params }),
    );
  }

  updateProgress(episodeId: string, podcastId: string, progress: number, completed: boolean) {
    return firstValueFrom(
      this.http.post<any>(`${this.BASE_URL}/library/history`, {
        episodeId,
        podcastId,
        progress,
        completed,
      }),
    );
  }

  getInProgress() {
    return firstValueFrom(this.http.get<any>(`${this.BASE_URL}/library/in-progress`));
  }

  getNowPlaying() {
    return firstValueFrom(this.http.get<any>(`${this.BASE_URL}/library/now-playing`));
  }

  getEpisodeProgress(episodeId: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.BASE_URL}/library/progress/${episodeId}`),
    );
  }

  getPodcastProgress(podcastId: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.BASE_URL}/library/podcast/${podcastId}/progress`),
    );
  }

  getPodcastInProgress(podcastId: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.BASE_URL}/library/podcast/${podcastId}/in-progress`),
    );
  }

  markAllPodcastProgress(podcastId: string, completed: boolean) {
    return firstValueFrom(
      this.http.post<any>(`${this.BASE_URL}/library/podcast/${podcastId}/mark-all`, { completed }),
    );
  }

  // ===== AUDIO URL =====
  getAudioProxyUrl(episodeId: string): string {
    return `${this.BASE_URL}/proxy/audio/${episodeId}`;
  }

  // ===== SERVER-SIDE DOWNLOADS =====
  downloadBatch(episodeIds: string[]) {
    return firstValueFrom(
      this.http.post<{ success: boolean; queued: number }>(`${this.BASE_URL}/episodes/download-batch`, { episodeIds }),
    );
  }

  downloadStatus(episodeIds: string[]) {
    return firstValueFrom(
      this.http.post<{ success: boolean; downloaded: string[]; pending: string[] }>(
        `${this.BASE_URL}/episodes/download-status`,
        { episodeIds },
      ),
    );
  }

  getSyncConfig() {
    return firstValueFrom(this.http.get<any>(`${this.BASE_URL}/sync-config`));
  }

  updateSyncConfig(payload: any) {
    return firstValueFrom(this.http.post<any>(`${this.BASE_URL}/sync-config`, payload));
  }
}
