export interface IPodcast {
  _id?: string;
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  ivooxUrl: string;
  rssFeedUrl: string;
  ivooxId: string;
  category?: string;
  language?: string;
  lastFetchedAt?: Date;
  episodeCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubscription {
  _id?: string;
  userId: string;
  podcastId: string;
  subscribedAt: Date;
  notifications: boolean;
}
