import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema';
import { PlayHistory, PlayHistoryDocument } from './schemas/play-history.schema';
import { SyncConfig, SyncConfigDocument } from './schemas/sync-config.schema';
import { EpisodeDownloaderService } from '../episodes/episode-downloader.service';

@Injectable()
export class LibraryService implements OnModuleInit {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    @InjectModel(PlayHistory.name) private playHistoryModel: Model<PlayHistoryDocument>,
    @InjectModel(SyncConfig.name) private syncConfigModel: Model<SyncConfigDocument>,
    private episodeDownloaderService: EpisodeDownloaderService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting comprehensive BSON types migration for library collections...');

    // 1. Migrate subscriptions
    try {
      this.logger.log('[Migration] Checking subscriptions for string userIds...');
      const subUserRes = await this.subscriptionModel.updateMany(
        { userId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } },
        [ { $set: { userId: { $toObjectId: '$userId' } } } ]
      ).exec();
      this.logger.log(`[Migration] Subscriptions (userId): migrated ${subUserRes.modifiedCount || 0} documents.`);
    } catch (err: any) {
      this.logger.warn(`[Migration] Subscriptions (userId) migration warning: ${err.message}`);
    }

    try {
      this.logger.log('[Migration] Checking subscriptions for string podcastIds...');
      const subPodcastRes = await this.subscriptionModel.updateMany(
        { podcastId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } },
        [ { $set: { podcastId: { $toObjectId: '$podcastId' } } } ]
      ).exec();
      this.logger.log(`[Migration] Subscriptions (podcastId): migrated ${subPodcastRes.modifiedCount || 0} documents.`);
    } catch (err: any) {
      this.logger.warn(`[Migration] Subscriptions (podcastId) migration warning: ${err.message}`);
    }

    // 2. Migrate favorites
    try {
      this.logger.log('[Migration] Checking favorites for string userIds...');
      const favUserRes = await this.favoriteModel.updateMany(
        { userId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } },
        [ { $set: { userId: { $toObjectId: '$userId' } } } ]
      ).exec();
      this.logger.log(`[Migration] Favorites (userId): migrated ${favUserRes.modifiedCount || 0} documents.`);
    } catch (err: any) {
      this.logger.warn(`[Migration] Favorites (userId) migration warning: ${err.message}`);
    }

    try {
      this.logger.log('[Migration] Checking favorites for string episodeIds...');
      const favEpisodeRes = await this.favoriteModel.updateMany(
        { episodeId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } },
        [ { $set: { episodeId: { $toObjectId: '$episodeId' } } } ]
      ).exec();
      this.logger.log(`[Migration] Favorites (episodeId): migrated ${favEpisodeRes.modifiedCount || 0} documents.`);
    } catch (err: any) {
      this.logger.warn(`[Migration] Favorites (episodeId) migration warning: ${err.message}`);
    }

    // 3. Migrate play histories
    try {
      this.logger.log('[Migration] Checking play histories for string userIds...');
      const playUserRes = await this.playHistoryModel.updateMany(
        { userId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } },
        [ { $set: { userId: { $toObjectId: '$userId' } } } ]
      ).exec();
      this.logger.log(`[Migration] Play histories (userId): migrated ${playUserRes.modifiedCount || 0} documents.`);
    } catch (err: any) {
      this.logger.warn(`[Migration] Play histories (userId) migration warning: ${err.message}`);
    }

    try {
      this.logger.log('[Migration] Checking play histories for string episodeIds...');
      const playEpisodeRes = await this.playHistoryModel.updateMany(
        { episodeId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } },
        [ { $set: { episodeId: { $toObjectId: '$episodeId' } } } ]
      ).exec();
      this.logger.log(`[Migration] Play histories (episodeId): migrated ${playEpisodeRes.modifiedCount || 0} documents.`);
    } catch (err: any) {
      this.logger.warn(`[Migration] Play histories (episodeId) migration warning: ${err.message}`);
    }

    try {
      this.logger.log('[Migration] Checking play histories for string podcastIds...');
      const playPodcastRes = await this.playHistoryModel.updateMany(
        { podcastId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } },
        [ { $set: { podcastId: { $toObjectId: '$podcastId' } } } ]
      ).exec();
      this.logger.log(`[Migration] Play histories (podcastId): migrated ${playPodcastRes.modifiedCount || 0} documents.`);
    } catch (err: any) {
      this.logger.warn(`[Migration] Play histories (podcastId) migration warning: ${err.message}`);
    }

    // 4. Migrate sync configs
    try {
      this.logger.log('[Migration] Checking sync configs for string userIds or queue arrays...');
      const syncConfigRes = await this.syncConfigModel.updateMany(
        { 
          $or: [
            { userId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } },
            { queue: { $elemMatch: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } } }
          ]
        },
        [
          {
            $set: {
              userId: {
                $cond: {
                  if: { $eq: [ { $type: '$userId' }, 'string' ] },
                  then: { $toObjectId: '$userId' },
                  else: '$userId'
                }
              },
              queue: {
                $cond: {
                  if: { $isArray: '$queue' },
                  then: {
                    $map: {
                      input: '$queue',
                      as: 'item',
                      in: {
                        $cond: {
                          if: { $eq: [ { $type: '$$item' }, 'string' ] },
                          then: { $toObjectId: '$$item' },
                          else: '$$item'
                        }
                      }
                    }
                  },
                  else: '$queue'
                }
              }
            }
          }
        ]
      ).exec();
      this.logger.log(`[Migration] Sync configs: migrated ${syncConfigRes.modifiedCount || 0} documents.`);
    } catch (err: any) {
      this.logger.warn(`[Migration] Sync configs migration warning: ${err.message}`);
    }

    this.logger.log('Comprehensive BSON types migration finished.');
  }

  // ===== SUBSCRIPTIONS =====
  async getUserSubscriptions(userId: string) {
    const userObj = new Types.ObjectId(userId);
    return this.subscriptionModel.find({ 
      $or: [
        { userId: userObj },
        { userId: userId }
      ]
    }).populate('podcastId').exec();
  }

  async subscribe(userId: string, podcastId: string) {
    return this.subscriptionModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), podcastId: new Types.ObjectId(podcastId) },
      { userId: new Types.ObjectId(userId), podcastId: new Types.ObjectId(podcastId) },
      { upsert: true, new: true }
    ).exec();
  }

  async unsubscribe(userId: string, podcastId: string) {
    const userObj = new Types.ObjectId(userId);
    const podcastObj = new Types.ObjectId(podcastId);
    return this.subscriptionModel.deleteOne({ 
      $and: [
        { $or: [ { userId: userObj }, { userId: userId } ] },
        { $or: [ { podcastId: podcastObj }, { podcastId: podcastId } ] }
      ]
    }).exec();
  }

  // ===== FAVORITES =====
  async getUserFavorites(userId: string) {
    const userObj = new Types.ObjectId(userId);
    return this.favoriteModel.find({ 
      $or: [
        { userId: userObj },
        { userId: userId }
      ]
    }).populate('episodeId').exec();
  }

  async addFavorite(userId: string, episodeId: string) {
    return this.favoriteModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), episodeId: new Types.ObjectId(episodeId) },
      { userId: new Types.ObjectId(userId), episodeId: new Types.ObjectId(episodeId) },
      { upsert: true, new: true }
    ).exec();
  }

  async removeFavorite(userId: string, episodeId: string) {
    const userObj = new Types.ObjectId(userId);
    const episodeObj = new Types.ObjectId(episodeId);
    return this.favoriteModel.deleteOne({ 
      $and: [
        { $or: [ { userId: userObj }, { userId: userId } ] },
        { $or: [ { episodeId: episodeObj }, { episodeId: episodeId } ] }
      ]
    }).exec();
  }

  // ===== HISTORY / PROGRESS =====
  async updateProgress(userId: string, episodeId: string, podcastId: string, progress: number, completed: boolean) {
    if (completed) {
      try {
        await this.syncConfigModel.updateOne(
          { userId: new Types.ObjectId(userId) },
          { $pull: { queue: new Types.ObjectId(episodeId) } }
        ).exec();
        this.logger.log(`[Queue] Removed completed episode ${episodeId} from user ${userId} queue`);
      } catch (err) {
        this.logger.error(`[Queue] Error removing completed episode from sync queue: ${err}`);
      }
    }
    return this.playHistoryModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), episodeId: new Types.ObjectId(episodeId) },
      { 
        userId: new Types.ObjectId(userId), 
        episodeId: new Types.ObjectId(episodeId), 
        podcastId: new Types.ObjectId(podcastId), 
        progress, 
        completed, 
        lastPlayedAt: new Date() 
      },
      { upsert: true, new: true }
    ).exec();
  }

  async getHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const objectId = new Types.ObjectId(userId);
    const filter = {
      $or: [
        { userId: objectId },
        { userId: userId }
      ]
    };
    const [history, total] = await Promise.all([
      this.playHistoryModel.find(filter)
        .sort({ lastPlayedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('episodeId')
        .exec(),
      this.playHistoryModel.countDocuments(filter).exec(),
    ]);
    return { history, total };
  }

  async getInProgressEpisodes(userId: string) {
    const objectId = new Types.ObjectId(userId);
    return this.playHistoryModel.find({ 
      $or: [
        { userId: objectId },
        { userId: userId }
      ],
      completed: false 
    })
      .sort({ lastPlayedAt: -1 })
      .populate('episodeId')
      .exec();
  }

  async getEpisodeProgress(userId: string, episodeId: string) {
    const userObj = new Types.ObjectId(userId);
    const episodeObj = new Types.ObjectId(episodeId);
    return this.playHistoryModel.findOne({ 
      $and: [
        { $or: [ { userId: userObj }, { userId: userId } ] },
        { $or: [ { episodeId: episodeObj }, { episodeId: episodeId } ] }
      ]
    }).exec();
  }

  async getPodcastProgress(userId: string, podcastId: string) {
    const userObj = new Types.ObjectId(userId);
    const podcastObj = new Types.ObjectId(podcastId);
    const history = await this.playHistoryModel.find({ 
      $and: [
        { $or: [ { userId: userObj }, { userId: userId } ] },
        { $or: [ { podcastId: podcastObj }, { podcastId: podcastId } ] }
      ], 
      completed: true 
    }).exec();
    return history.map(h => h.episodeId.toString());
  }

  async markAllAsCompleted(userId: string, podcastId: string, completed: boolean, episodeIds: string[]) {
    const userObj = new Types.ObjectId(userId);
    const podcastObj = new Types.ObjectId(podcastId);
    if (completed) {
      try {
        const objectIds = episodeIds.map(id => new Types.ObjectId(id));
        await this.syncConfigModel.updateOne(
          { $or: [ { userId: userObj }, { userId: userId } ] },
          { $pull: { queue: { $in: [...objectIds, ...episodeIds] } } }
        ).exec();
        this.logger.log(`[Queue] Removed all completed episodes for podcast ${podcastId} from user ${userId} queue`);
      } catch (err) {
        this.logger.error(`[Queue] Error removing all completed episodes from sync queue: ${err}`);
      }

      const ops = episodeIds.map(id => ({
        updateOne: {
          filter: { 
            $and: [
              { $or: [ { userId: userObj }, { userId: userId } ] },
              { $or: [ { episodeId: new Types.ObjectId(id) }, { episodeId: id } ] }
            ]
          },
          update: { 
            userId: new Types.ObjectId(userId), 
            episodeId: new Types.ObjectId(id), 
            podcastId: new Types.ObjectId(podcastId), 
            progress: 100, 
            completed: true, 
            lastPlayedAt: new Date() 
          },
          upsert: true
        }
      }));
      return this.playHistoryModel.bulkWrite(ops as any);
    } else {
      return this.playHistoryModel.deleteMany({ 
        $and: [
          { $or: [ { userId: userObj }, { userId: userId } ] },
          { $or: [ { podcastId: podcastObj }, { podcastId: podcastId } ] }
        ] 
      }).exec();
    }
  }

  // ===== SYNC CONFIG =====
  async getSyncConfig(userId: string) {
    this.logger.log(`Fetching sync config for user: ${userId}`);
    const userObj = new Types.ObjectId(userId);
    const filter = {
      $or: [
        { userId: userObj },
        { userId: userId }
      ]
    };
    const config = await this.syncConfigModel.findOne(filter)
      .populate({
        path: 'queue',
        populate: {
          path: 'podcastId',
          select: 'title imageUrl'
        }
      })
      .exec();
    
    // Strictly use the manual queue from SyncConfig
    const fullConfig = await this.syncConfigModel.findOne(filter)
      .populate({
        path: 'queue',
        populate: {
          path: 'podcastId',
          select: 'title imageUrl'
        }
      })
      .exec();
    
    const effectiveQueue = fullConfig?.queue || [];
    
    // Detailed log for the response to the agent
    const episodeTitles = (effectiveQueue as any[]).map(e => e.title || e._id).join(', ');
    this.logger.log(`[AgentSync] Sending config to agent for user ${userId}:
      - USB Serial: ${config?.targetUsbSerial || ''}
      - Folder: ${config?.targetFolder || 'Podcasts'}
      - Queue Count: ${effectiveQueue.length}
      - Items: [${episodeTitles}]`);

    if (!config) {
      return null;
    }

    return {
      userId: config.userId,
      targetUsbSerial: config.targetUsbSerial || '',
      targetFolder: config.targetFolder || 'Podcasts',
      syncInterval: config.syncInterval || 60,
      lastSyncAt: config.lastSyncAt,
      queue: effectiveQueue,
      usbTotalSpace: config.usbTotalSpace,
      usbFreeSpace: config.usbFreeSpace,
      usbPodcastsSpace: config.usbPodcastsSpace,
      usbOtherSpace: config.usbOtherSpace,
      usbFormat: config.usbFormat
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
    if (update.queue !== undefined) cleanUpdate.queue = update.queue;
    if (update.usbTotalSpace !== undefined) cleanUpdate.usbTotalSpace = update.usbTotalSpace;
    if (update.usbFreeSpace !== undefined) cleanUpdate.usbFreeSpace = update.usbFreeSpace;
    if (update.usbPodcastsSpace !== undefined) cleanUpdate.usbPodcastsSpace = update.usbPodcastsSpace;
    if (update.usbOtherSpace !== undefined) cleanUpdate.usbOtherSpace = update.usbOtherSpace;
    if (update.usbFormat !== undefined) cleanUpdate.usbFormat = update.usbFormat;

    await this.syncConfigModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: cleanUpdate },
      { new: true, upsert: true }
    ).exec();

    // Trigger downloads for new episodes in the queue
    if (update.queue && Array.isArray(update.queue)) {
      this.episodeDownloaderService.triggerDownloads(update.queue);
    }

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

    // Trigger downloads for the updated queue
    if (episodeIds && Array.isArray(episodeIds)) {
      this.episodeDownloaderService.triggerDownloads(episodeIds);
    }

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

  // ===== AUTO-QUEUE LOGIC =====
  
  /** Get all user IDs subscribed to a podcast */
  async getSubscribedUserIds(podcastId: string): Promise<string[]> {
    const podcastObj = new Types.ObjectId(podcastId);
    const subs = await this.subscriptionModel.find({ 
      $or: [
        { podcastId: podcastObj },
        { podcastId: podcastId }
      ]
    }).exec();
    return subs.map(s => s.userId.toString());
  }

  /** Add multiple episodes to the queues of multiple users */
  async addEpisodesToUserQueues(userIds: string[], episodeIds: string[]) {
    if (userIds.length === 0 || episodeIds.length === 0) return;

    this.logger.log(`[AutoQueue] Adding ${episodeIds.length} episodes to ${userIds.length} users`);
    
    const epObjectIds = episodeIds.map(id => new Types.ObjectId(id));

    // Update each user's queue using $push with $each to add to the end
    const ops = userIds.map(userId => ({
      updateOne: {
        filter: { userId: new Types.ObjectId(userId) },
        update: { 
          $push: { 
            queue: { $each: epObjectIds } 
          } 
        },
        upsert: true
      }
    }));

    await this.syncConfigModel.bulkWrite(ops);

    // Trigger background downloads for the added episodes
    this.episodeDownloaderService.triggerDownloads(episodeIds);
  }
}
