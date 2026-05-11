import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayHistory, PlayHistoryDocument } from './schemas/play-history.schema';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectModel(PlayHistory.name) private playHistoryModel: Model<PlayHistoryDocument>,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  // ===== SUBSCRIPTIONS =====

  async getUserSubscriptions(userId: string): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel
      .find({ userId })
      .populate('podcastId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async subscribe(userId: string, podcastId: string): Promise<SubscriptionDocument> {
    return this.subscriptionModel.findOneAndUpdate(
      { userId, podcastId },
      { userId, podcastId, notifications: true },
      { upsert: true, new: true },
    ).exec();
  }

  async unsubscribe(userId: string, podcastId: string): Promise<void> {
    await this.subscriptionModel.deleteOne({ userId, podcastId }).exec();
  }

  async isSubscribed(userId: string, podcastId: string): Promise<boolean> {
    const sub = await this.subscriptionModel.findOne({ userId, podcastId }).exec();
    return !!sub;
  }

  // ===== FAVORITES =====

  async getUserFavorites(userId: string): Promise<FavoriteDocument[]> {
    return this.favoriteModel
      .find({ userId })
      .populate({
        path: 'episodeId',
        populate: { path: 'podcastId', select: 'title imageUrl' },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async addFavorite(userId: string, episodeId: string): Promise<FavoriteDocument> {
    return this.favoriteModel.findOneAndUpdate(
      { userId, episodeId },
      { userId, episodeId },
      { upsert: true, new: true },
    ).exec();
  }

  async removeFavorite(userId: string, episodeId: string): Promise<void> {
    await this.favoriteModel.deleteOne({ userId, episodeId }).exec();
  }

  async isFavorite(userId: string, episodeId: string): Promise<boolean> {
    const fav = await this.favoriteModel.findOne({ userId, episodeId }).exec();
    return !!fav;
  }

  // ===== PLAY HISTORY =====

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      this.playHistoryModel
        .find({ userId })
        .populate({
          path: 'episodeId',
          populate: { path: 'podcastId', select: 'title imageUrl' },
        })
        .sort({ lastPlayedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.playHistoryModel.countDocuments({ userId }).exec(),
    ]);
    return { history, total };
  }

  async updateProgress(
    userId: string,
    episodeId: string,
    podcastId: string,
    progress: number,
    completed: boolean,
  ): Promise<PlayHistoryDocument> {
    return this.playHistoryModel.findOneAndUpdate(
      { userId, episodeId },
      {
        userId,
        episodeId,
        podcastId,
        progress,
        completed,
        lastPlayedAt: new Date(),
      },
      { upsert: true, new: true },
    ).exec();
  }

  async getEpisodeProgress(userId: string, episodeId: string): Promise<PlayHistoryDocument | null> {
    return this.playHistoryModel.findOne({ userId, episodeId }).exec();
  }

  async getInProgressEpisodes(userId: string, limit = 10): Promise<PlayHistoryDocument[]> {
    return this.playHistoryModel
      .find({ userId, completed: false, progress: { $gt: 0 } })
      .populate({
        path: 'episodeId',
        populate: { path: 'podcastId', select: 'title imageUrl' },
      })
      .sort({ lastPlayedAt: -1 })
      .limit(limit)
      .exec();
  }

  async getUnplayedCount(userId: string, podcastId: string): Promise<number> {
    const playedEpisodes = await this.playHistoryModel
      .find({ userId, podcastId, completed: true })
      .select('episodeId')
      .exec();

    const playedIds = playedEpisodes.map(h => h.episodeId.toString());

    // This would need the Episode model; for now return 0
    // In a full implementation, query episodes not in playedIds
    return 0;
  }
}
