import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema';
import { PlayHistory, PlayHistoryDocument } from './schemas/play-history.schema';
import { SyncConfig, SyncConfigDocument } from './schemas/sync-config.schema';

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    @InjectModel(PlayHistory.name) private playHistoryModel: Model<PlayHistoryDocument>,
    @InjectModel(SyncConfig.name) private syncConfigModel: Model<SyncConfigDocument>,
  ) {}

  // ===== SUBSCRIPTIONS =====
  async getUserSubscriptions(userId: string) {
    return this.subscriptionModel.find({ userId }).populate('podcastId').exec();
  }

  async subscribe(userId: string, podcastId: string) {
    return this.subscriptionModel.findOneAndUpdate(
      { userId, podcastId },
      { userId, podcastId },
      { upsert: true, new: true }
    ).exec();
  }

  async unsubscribe(userId: string, podcastId: string) {
    return this.subscriptionModel.deleteOne({ userId, podcastId }).exec();
  }

  // ===== FAVORITES =====
  async getUserFavorites(userId: string) {
    return this.favoriteModel.find({ userId }).populate('episodeId').exec();
  }

  async addFavorite(userId: string, episodeId: string) {
    return this.favoriteModel.findOneAndUpdate(
      { userId, episodeId },
      { userId, episodeId },
      { upsert: true, new: true }
    ).exec();
  }

  async removeFavorite(userId: string, episodeId: string) {
    return this.favoriteModel.deleteOne({ userId, episodeId }).exec();
  }

  // ===== HISTORY / PROGRESS =====
  async updateProgress(userId: string, episodeId: string, podcastId: string, progress: number, completed: boolean) {
    return this.playHistoryModel.findOneAndUpdate(
      { userId, episodeId },
      { userId, episodeId, podcastId, progress, completed, lastPlayedAt: new Date() },
      { upsert: true, new: true }
    ).exec();
  }

  async getHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      this.playHistoryModel.find({ userId })
        .sort({ lastPlayedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('episodeId')
        .exec(),
      this.playHistoryModel.countDocuments({ userId }).exec(),
    ]);
    return { history, total };
  }

  async getInProgressEpisodes(userId: string) {
    return this.playHistoryModel.find({ userId, completed: false })
      .sort({ lastPlayedAt: -1 })
      .populate('episodeId')
      .exec();
  }

  async getEpisodeProgress(userId: string, episodeId: string) {
    return this.playHistoryModel.findOne({ userId, episodeId }).exec();
  }

  async getPodcastProgress(userId: string, podcastId: string) {
    const history = await this.playHistoryModel.find({ userId, podcastId, completed: true }).exec();
    return history.map(h => h.episodeId.toString());
  }

  async markAllAsCompleted(userId: string, podcastId: string, completed: boolean, episodeIds: string[]) {
    if (completed) {
      const ops = episodeIds.map(id => ({
        updateOne: {
          filter: { userId, episodeId: id },
          update: { userId, episodeId: id, podcastId, progress: 100, completed: true, lastPlayedAt: new Date() },
          upsert: true
        }
      }));
      return this.playHistoryModel.bulkWrite(ops);
    } else {
      return this.playHistoryModel.deleteMany({ userId, podcastId }).exec();
    }
  }

  // ===== SYNC CONFIG =====
  async getSyncConfig(userId: string) {
    this.logger.log(`Fetching sync config for user: ${userId}`);
    const config = await this.syncConfigModel.findOne({ userId: new Types.ObjectId(userId) })
      .populate('queue')
      .exec();
    
    if (!config) return null;

    // If manual queue is empty, use favorites as default fallback
    let effectiveQueue = config.queue;
    if (!effectiveQueue || effectiveQueue.length === 0) {
      const favorites = await this.favoriteModel.find({ userId: new Types.ObjectId(userId) })
        .populate('episodeId')
        .exec();
      effectiveQueue = favorites.map(f => f.episodeId) as any;
      this.logger.log(`Queue empty, using ${effectiveQueue.length} favorites for sync.`);
    } else {
      // If queue has items, ensure they are populated
      // We re-query with populate because findOneAndUpdate might not have populated the result
      const fullConfig = await this.syncConfigModel.findOne({ userId: new Types.ObjectId(userId) })
        .populate('queue')
        .exec();
      effectiveQueue = fullConfig?.queue || [];
    }

    return {
      userId: config.userId,
      targetUsbSerial: config.targetUsbSerial || '',
      targetFolder: config.targetFolder || 'Podcasts',
      syncInterval: config.syncInterval || 60,
      lastSyncAt: config.lastSyncAt,
      queue: effectiveQueue
    };
  }

  async updateSyncConfig(userId: string, update: Partial<SyncConfig>) {
    this.logger.log(`[Config] Updating for user ${userId}. Data: ${JSON.stringify(update)}`);
    
    // Ensure we don't overwrite with nulls if fields are missing in update
    const cleanUpdate: any = {};
    if (update.targetUsbSerial !== undefined) cleanUpdate.targetUsbSerial = update.targetUsbSerial;
    if (update.targetFolder !== undefined) cleanUpdate.targetFolder = update.targetFolder;
    if (update.syncInterval !== undefined) cleanUpdate.syncInterval = update.syncInterval;
    if (update.lastSyncAt !== undefined) cleanUpdate.lastSyncAt = update.lastSyncAt;

    await this.syncConfigModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: cleanUpdate },
      { new: true, upsert: true }
    ).exec();

    return this.getSyncConfig(userId);
  }

  // Alias for backward compatibility in controller
  async saveSyncConfig(userId: string, targetUsbSerial: string, targetFolder: string) {
    return this.updateSyncConfig(userId, { targetUsbSerial, targetFolder });
  }

  async updateQueue(userId: string, episodeIds: string[]) {
    this.logger.log(`[Queue] Updating for user ${userId}. Received ${episodeIds?.length || 0} IDs`);
    if (episodeIds && episodeIds.length > 0) {
      this.logger.log(`[Queue] First ID: ${episodeIds[0]}`);
    }
    
    const result = await this.syncConfigModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { queue: episodeIds.map(id => new Types.ObjectId(id)) } },
      { new: true, upsert: true }
    ).exec();

    this.logger.log(`[Queue] Update complete. New queue length in DB: ${result.queue.length}`);
    return result;
  }

  // ===== PAIRING =====
  async generatePairingCode(userId: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    this.logger.log(`[Pairing] Generating code ${code} for user ${userId}...`);
    
    await this.syncConfigModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { pairingCode: code, pairingCodeExpires: expires },
      { upsert: true, returnDocument: 'after' }
    ).exec();

    this.logger.log(`[Pairing] Code ${code} persisted successfully.`);
    return code;
  }

  async validatePairingCode(code: string): Promise<string | null> {
    this.logger.log(`[Pairing] Validating code: ${code}`);
    
    // Fetch only by code first to see if it exists at all
    const config = await this.syncConfigModel.findOne({ pairingCode: code }).exec();

    if (!config) {
      this.logger.warn(`[Pairing] Code not found in database: ${code}`);
      return null;
    }

    const now = new Date();
    if (config.pairingCodeExpires && config.pairingCodeExpires < now) {
      this.logger.warn(`[Pairing] Code ${code} has expired. Expired at: ${config.pairingCodeExpires}, Now: ${now}`);
      return null;
    }

    this.logger.log(`[Pairing] Code ${code} is valid for user ${config.userId}. Clearing code...`);

    // Clear code after use
    await this.syncConfigModel.updateOne(
      { _id: config._id },
      { $unset: { pairingCode: 1, pairingCodeExpires: 1 } }
    ).exec();

    return config.userId.toString();
  }
}
