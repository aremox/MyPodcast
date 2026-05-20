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
    this.logger.log('Starting comprehensive BSON types deduplication and migration for library collections...');

    // 1. Migrate & deduplicate subscriptions
    try {
      this.logger.log('[Migration] Fetching all subscriptions to detect and merge duplicate user-podcast records...');
      const allSubs = await this.subscriptionModel.find({}).exec();
      const subGroups = new Map<string, any[]>();
      for (const sub of allSubs) {
        if (!sub.userId || !sub.podcastId) continue;
        const uStr = sub.userId instanceof Types.ObjectId ? sub.userId.toHexString() : String(sub.userId);
        const pStr = sub.podcastId instanceof Types.ObjectId ? sub.podcastId.toHexString() : String(sub.podcastId);
        const key = `${uStr}_${pStr}`;
        if (!subGroups.has(key)) {
          subGroups.set(key, []);
        }
        subGroups.get(key)!.push(sub);
      }

      let subNeedsFixCount = 0;
      let subMergedCount = 0;

      for (const [key, docs] of subGroups.entries()) {
        const [userIdStr, podcastIdStr] = key.split('_');
        const userObj = new Types.ObjectId(userIdStr);
        const podcastObj = new Types.ObjectId(podcastIdStr);

        if (docs.length === 1) {
          const doc = docs[0];
          const needsFix = typeof doc.userId === 'string' || typeof doc.podcastId === 'string';
          if (needsFix) {
            await this.subscriptionModel.updateOne(
              { _id: doc._id },
              { $set: { userId: userObj, podcastId: podcastObj } }
            ).exec();
            subNeedsFixCount++;
          }
          continue;
        }

        // If duplicate subscriptions
        this.logger.warn(`[Migration] Duplicate subscriptions found for user ${userIdStr} and podcast ${podcastIdStr}. Merging...`);
        let primaryDoc = docs.find(d => d.userId instanceof Types.ObjectId && d.podcastId instanceof Types.ObjectId);
        if (!primaryDoc) {
          primaryDoc = docs[0];
        }

        // Merge fields
        let notifications = false;
        for (const doc of docs) {
          if (doc.notifications === true) {
            notifications = true;
          }
        }

        await this.subscriptionModel.updateOne(
          { _id: primaryDoc._id },
          { $set: { userId: userObj, podcastId: podcastObj, notifications } }
        ).exec();

        // Delete others
        const otherIds = docs.filter(d => d._id.toString() !== primaryDoc!._id.toString()).map(d => d._id);
        await this.subscriptionModel.deleteMany({ _id: { $in: otherIds } }).exec();
        subMergedCount++;
      }
      this.logger.log(`[Migration] Subscriptions check complete. Fixed types: ${subNeedsFixCount}, Merged/Deduplicated: ${subMergedCount}`);
    } catch (err: any) {
      this.logger.error(`[Migration] Subscriptions migration/merge error: ${err.message}`, err.stack);
    }

    // 2. Migrate & deduplicate favorites
    try {
      this.logger.log('[Migration] Fetching all favorites to detect and merge duplicate user-episode records...');
      const allFavs = await this.favoriteModel.find({}).exec();
      const favGroups = new Map<string, any[]>();
      for (const fav of allFavs) {
        if (!fav.userId || !fav.episodeId) continue;
        const uStr = fav.userId instanceof Types.ObjectId ? fav.userId.toHexString() : String(fav.userId);
        const eStr = fav.episodeId instanceof Types.ObjectId ? fav.episodeId.toHexString() : String(fav.episodeId);
        const key = `${uStr}_${eStr}`;
        if (!favGroups.has(key)) {
          favGroups.set(key, []);
        }
        favGroups.get(key)!.push(fav);
      }

      let favNeedsFixCount = 0;
      let favMergedCount = 0;

      for (const [key, docs] of favGroups.entries()) {
        const [userIdStr, episodeIdStr] = key.split('_');
        const userObj = new Types.ObjectId(userIdStr);
        const episodeObj = new Types.ObjectId(episodeIdStr);

        if (docs.length === 1) {
          const doc = docs[0];
          const needsFix = typeof doc.userId === 'string' || typeof doc.episodeId === 'string';
          if (needsFix) {
            await this.favoriteModel.updateOne(
              { _id: doc._id },
              { $set: { userId: userObj, episodeId: episodeObj } }
            ).exec();
            favNeedsFixCount++;
          }
          continue;
        }

        this.logger.warn(`[Migration] Duplicate favorites found for user ${userIdStr} and episode ${episodeIdStr}. Merging...`);
        let primaryDoc = docs.find(d => d.userId instanceof Types.ObjectId && d.episodeId instanceof Types.ObjectId);
        if (!primaryDoc) {
          primaryDoc = docs[0];
        }

        await this.favoriteModel.updateOne(
          { _id: primaryDoc._id },
          { $set: { userId: userObj, episodeId: episodeObj } }
        ).exec();

        // Delete others
        const otherIds = docs.filter(d => d._id.toString() !== primaryDoc!._id.toString()).map(d => d._id);
        await this.favoriteModel.deleteMany({ _id: { $in: otherIds } }).exec();
        favMergedCount++;
      }
      this.logger.log(`[Migration] Favorites check complete. Fixed types: ${favNeedsFixCount}, Merged/Deduplicated: ${favMergedCount}`);
    } catch (err: any) {
      this.logger.error(`[Migration] Favorites migration/merge error: ${err.message}`, err.stack);
    }

    // 3. Migrate & deduplicate play histories
    try {
      this.logger.log('[Migration] Fetching all play histories to detect and merge duplicate user-episode records...');
      const allHistories = await this.playHistoryModel.find({}).exec();
      const historyGroups = new Map<string, any[]>();
      for (const h of allHistories) {
        if (!h.userId || !h.episodeId) continue;
        const uStr = h.userId instanceof Types.ObjectId ? h.userId.toHexString() : String(h.userId);
        const eStr = h.episodeId instanceof Types.ObjectId ? h.episodeId.toHexString() : String(h.episodeId);
        const key = `${uStr}_${eStr}`;
        if (!historyGroups.has(key)) {
          historyGroups.set(key, []);
        }
        historyGroups.get(key)!.push(h);
      }

      let historyNeedsFixCount = 0;
      let historyMergedCount = 0;

      for (const [key, docs] of historyGroups.entries()) {
        const [userIdStr, episodeIdStr] = key.split('_');
        const userObj = new Types.ObjectId(userIdStr);
        const episodeObj = new Types.ObjectId(episodeIdStr);

        if (docs.length === 1) {
          const doc = docs[0];
          const needsFix = typeof doc.userId === 'string' || typeof doc.episodeId === 'string' || (doc.podcastId && typeof doc.podcastId === 'string');
          if (needsFix) {
            const pObj = doc.podcastId ? (doc.podcastId instanceof Types.ObjectId ? doc.podcastId : new Types.ObjectId(String(doc.podcastId))) : undefined;
            await this.playHistoryModel.updateOne(
              { _id: doc._id },
              { $set: { userId: userObj, episodeId: episodeObj, podcastId: pObj } }
            ).exec();
            historyNeedsFixCount++;
          }
          continue;
        }

        this.logger.warn(`[Migration] Duplicate play histories found for user ${userIdStr} and episode ${episodeIdStr}. Merging...`);
        let primaryDoc = docs.find(d => d.userId instanceof Types.ObjectId && d.episodeId instanceof Types.ObjectId);
        if (!primaryDoc) {
          primaryDoc = docs[0];
        }

        // Merge fields
        let maxProgress = 0;
        let completed = false;
        let latestPlayed = primaryDoc.lastPlayedAt || new Date(0);
        let podcastObj: Types.ObjectId | undefined = undefined;

        for (const doc of docs) {
          if (doc.progress > maxProgress) {
            maxProgress = doc.progress;
          }
          if (doc.completed === true) {
            completed = true;
          }
          if (doc.lastPlayedAt && doc.lastPlayedAt > latestPlayed) {
            latestPlayed = doc.lastPlayedAt;
          }
          if (doc.podcastId && !podcastObj) {
            podcastObj = doc.podcastId instanceof Types.ObjectId ? doc.podcastId : new Types.ObjectId(String(doc.podcastId));
          }
        }

        await this.playHistoryModel.updateOne(
          { _id: primaryDoc._id },
          { 
            $set: { 
              userId: userObj, 
              episodeId: episodeObj, 
              podcastId: podcastObj,
              progress: maxProgress,
              completed,
              lastPlayedAt: latestPlayed
            } 
          }
        ).exec();

        // Delete others
        const otherIds = docs.filter(d => d._id.toString() !== primaryDoc!._id.toString()).map(d => d._id);
        await this.playHistoryModel.deleteMany({ _id: { $in: otherIds } }).exec();
        historyMergedCount++;
      }
      this.logger.log(`[Migration] Play histories check complete. Fixed types: ${historyNeedsFixCount}, Merged/Deduplicated: ${historyMergedCount}`);
    } catch (err: any) {
      this.logger.error(`[Migration] Play histories migration/merge error: ${err.message}`, err.stack);
    }

    // 4. Migrate & deduplicate sync configs (recovering lost queues!)
    try {
      this.logger.log('[Migration] Fetching all sync configs to detect and merge duplicate user records...');
      const allConfigs = await this.syncConfigModel.find({}).exec();
      const configGroups = new Map<string, any[]>();
      for (const config of allConfigs) {
        if (!config.userId) continue;
        const key = config.userId instanceof Types.ObjectId ? config.userId.toHexString() : String(config.userId);
        if (!configGroups.has(key)) {
          configGroups.set(key, []);
        }
        configGroups.get(key)!.push(config);
      }

      let configNeedsFixCount = 0;
      let configMergedCount = 0;

      for (const [userIdStr, docs] of configGroups.entries()) {
        const userObj = new Types.ObjectId(userIdStr);

        if (docs.length === 1) {
          const doc = docs[0];
          // If the only document has a string userId, update it to ObjectId
          if (typeof doc.userId === 'string') {
            this.logger.log(`[Migration] Converting single sync config userId to ObjectId for user: ${userIdStr}`);
            
            // Clean up any string items in queue
            const cleanedQueue = (doc.queue || []).map((q: any) => 
              q instanceof Types.ObjectId ? q : new Types.ObjectId(String(q))
            );

            await this.syncConfigModel.updateOne(
              { _id: doc._id },
              { $set: { userId: userObj, queue: cleanedQueue } }
            ).exec();
            configNeedsFixCount++;
          } else {
            // Even if it's already an ObjectId, make sure the queue has ObjectIds
            const queueNeedsFix = doc.queue && doc.queue.some((q: any) => typeof q === 'string');
            if (queueNeedsFix) {
              this.logger.log(`[Migration] Converting string queue elements to ObjectId for user: ${userIdStr}`);
              const cleanedQueue = (doc.queue || []).map((q: any) => 
                q instanceof Types.ObjectId ? q : new Types.ObjectId(String(q))
              );
              await this.syncConfigModel.updateOne(
                { _id: doc._id },
                { $set: { queue: cleanedQueue } }
              ).exec();
              configNeedsFixCount++;
            }
          }
          continue;
        }

        // If we reach here, we have duplicates (docs.length > 1)
        this.logger.warn(`[Migration] Detected duplicate sync configs for user: ${userIdStr}. Merging ${docs.length} documents...`);
        
        let primaryDoc = docs.find(d => d.userId instanceof Types.ObjectId);
        if (!primaryDoc) {
          primaryDoc = docs[0];
        }

        // Merge fields
        const mergedQueueSet = new Set<string>();
        let targetUsbSerial = '';
        let targetFolder = 'Podcasts';
        let syncInterval = 60;
        let lastSyncAt: Date | undefined = undefined;
        let usbTotalSpace: number | undefined = undefined;
        let usbFreeSpace: number | undefined = undefined;
        let usbPodcastsSpace: number | undefined = undefined;
        let usbOtherSpace: number | undefined = undefined;
        let usbFormat: string | undefined = undefined;
        let pairingCode: string | undefined = undefined;
        let pairingCodeExpires: Date | undefined = undefined;

        for (const doc of docs) {
          if (doc.queue && Array.isArray(doc.queue)) {
            for (const q of doc.queue) {
              if (q) {
                const qStr = q instanceof Types.ObjectId ? q.toHexString() : String(q);
                mergedQueueSet.add(qStr);
              }
            }
          }
          if (doc.targetUsbSerial && !targetUsbSerial) targetUsbSerial = doc.targetUsbSerial;
          if (doc.targetFolder && (!targetFolder || targetFolder === 'Podcasts')) targetFolder = doc.targetFolder;
          if (doc.syncInterval && doc.syncInterval !== 60) syncInterval = doc.syncInterval;
          if (doc.lastSyncAt) {
            if (!lastSyncAt || doc.lastSyncAt > lastSyncAt) {
              lastSyncAt = doc.lastSyncAt;
            }
          }
          if (doc.usbTotalSpace && !usbTotalSpace) usbTotalSpace = doc.usbTotalSpace;
          if (doc.usbFreeSpace && !usbFreeSpace) usbFreeSpace = doc.usbFreeSpace;
          if (doc.usbPodcastsSpace && !usbPodcastsSpace) usbPodcastsSpace = doc.usbPodcastsSpace;
          if (doc.usbOtherSpace && !usbOtherSpace) usbOtherSpace = doc.usbOtherSpace;
          if (doc.usbFormat && !usbFormat) usbFormat = doc.usbFormat;
          if (doc.pairingCode && !pairingCode) {
            pairingCode = doc.pairingCode;
            pairingCodeExpires = doc.pairingCodeExpires;
          }
        }

        const mergedQueue = Array.from(mergedQueueSet).map(id => new Types.ObjectId(id));

        this.logger.log(`[Migration] User ${userIdStr} merged queue size: ${mergedQueue.length} (previous docs had lengths: ${docs.map(d => d.queue?.length || 0).join(', ')})`);

        // Update the primary document
        await this.syncConfigModel.updateOne(
          { _id: primaryDoc._id },
          {
            $set: {
              userId: userObj,
              queue: mergedQueue,
              targetUsbSerial,
              targetFolder,
              syncInterval,
              lastSyncAt,
              usbTotalSpace,
              usbFreeSpace,
              usbPodcastsSpace,
              usbOtherSpace,
              usbFormat,
              pairingCode,
              pairingCodeExpires
            }
          }
        ).exec();

        // Delete all OTHER duplicate documents
        const otherDocIds = docs.filter(d => d._id.toString() !== primaryDoc!._id.toString()).map(d => d._id);
        const delRes = await this.syncConfigModel.deleteMany({ _id: { $in: otherDocIds } }).exec();
        this.logger.log(`[Migration] User ${userIdStr} duplicate cleanup: deleted ${delRes.deletedCount || 0} duplicate documents.`);
        configMergedCount++;
      }
      this.logger.log(`[Migration] Sync configs check complete. Fixed types: ${configNeedsFixCount}, Merged/Deduplicated: ${configMergedCount}`);
    } catch (err: any) {
      this.logger.error(`[Migration] Sync configs migration/merge error: ${err.message}`, err.stack);
    }

    this.logger.log('Comprehensive BSON types migration and deduplication finished.');
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
