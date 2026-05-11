import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PodcastsService } from './podcasts.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private podcastsService: PodcastsService) {}

  /**
   * Refresh all RSS feeds every 30 minutes.
   * Detects new episodes and stores them in MongoDB.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleFeedRefresh() {
    this.logger.log('⏰ Starting scheduled feed refresh...');
    try {
      await this.podcastsService.refreshAllFeeds();
      this.logger.log('✅ Scheduled feed refresh completed');
    } catch (error) {
      this.logger.error(`❌ Scheduled feed refresh failed: ${error.message}`);
    }
  }
}
