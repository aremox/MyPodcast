export interface IEpisode {
  _id?: string;
  podcastId: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl?: string;
  duration?: string;
  durationSeconds?: number;
  publishedAt: Date;
  guid: string;
  ivooxUrl?: string;
  fileSize?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPlayHistory {
  _id?: string;
  userId: string;
  episodeId: string;
  podcastId: string;
  progress: number;
  completed: boolean;
  lastPlayedAt: Date;
}

export interface IFavorite {
  _id?: string;
  userId: string;
  episodeId: string;
  createdAt: Date;
}
