import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayHistory, PlayHistoryDocument } from './schemas/play-history.schema';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { SyncConfig, SyncConfigDocument } from './schemas/sync-config.schema';

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectModel(PlayHistory.name) private playHistoryModel: Model<PlayHistoryDocument>,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SyncConfig.name) private syncConfigModel: Model<SyncConfigDocument>,
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
      { upsert: true, returnDocument: 'after' },
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
      { upsert: true, returnDocument: 'after' },
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
      { upsert: true, returnDocument: 'after' },
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

  async getPodcastProgress(userId: string, podcastId: string): Promise<string[]> {
    const history = await this.playHistoryModel
      .find({ userId, podcastId, completed: true })
      .select('episodeId')
      .exec();
    return history.map(h => h.episodeId.toString());
  }

  async markAllAsCompleted(userId: string, podcastId: string, completed: boolean, allEpisodeIds: string[]): Promise<void> {
    if (!completed) {
      // Just set completed to false for all existing history for this podcast
      await this.playHistoryModel.updateMany(
        { userId, podcastId },
        { $set: { completed: false, progress: 0 } }
      ).exec();
    } else {
      // Need to create or update history for ALL episodes to be completed
      const bulkOps: any[] = allEpisodeIds.map(episodeId => ({
        updateOne: {
          filter: { userId, episodeId },
          update: {
            $set: {
              userId,
              episodeId,
              podcastId,
              progress: 100, // Or whatever max is, but completed: true is the key
              completed: true,
              lastPlayedAt: new Date(),
            }
          },
          upsert: true
        }
      }));

      if (bulkOps.length > 0) {
        await this.playHistoryModel.bulkWrite(bulkOps);
      }
    }
  }

  // ===== SYNC CONFIG =====

  async getSyncConfig(userId: string): Promise<SyncConfigDocument | null> {
    return this.syncConfigModel.findOne({ userId }).exec();
  }

  async saveSyncConfig(userId: string, targetUsbSerial: string, targetFolder: string): Promise<SyncConfigDocument> {
    return this.syncConfigModel.findOneAndUpdate(
      { userId },
      { userId, targetUsbSerial, targetFolder },
      { upsert: true, returnDocument: 'after' }
    ).exec();
  }

  async updateLastSyncAt(userId: string): Promise<void> {
    await this.syncConfigModel.updateOne({ userId }, { lastSyncAt: new Date() }).exec();
  }

  async generatePairingCode(userId: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10); // 10 mins

    await this.syncConfigModel.findOneAndUpdate(
      { userId },
      { userId, pairingCode: code, pairingCodeExpires: expires },
      { upsert: true }
    ).exec();

    return code;
  }

  async validatePairingCode(code: string): Promise<string | null> {
    const config = await this.syncConfigModel.findOne({
      pairingCode: code,
      pairingCodeExpires: { $gt: new Date() }
    }).exec();

    if (!config) return null;

    // Clear code after use
    config.pairingCode = undefined;
    config.pairingCodeExpires = undefined;
    await config.save();

    return config.userId.toString();
  }
}
