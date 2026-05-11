import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Podcast, PodcastDocument } from './schemas/podcast.schema';
import { RssParserService } from './rss-parser.service';
import { ScraperService } from './scraper.service';
import { EpisodesService } from '../episodes/episodes.service';

@Injectable()
export class PodcastsService {
  private readonly logger = new Logger(PodcastsService.name);

  constructor(
    @InjectModel(Podcast.name) private podcastModel: Model<PodcastDocument>,
    private rssParserService: RssParserService,
    private scraperService: ScraperService,
    private episodesService: EpisodesService,
  ) {}

  async findAll(): Promise<PodcastDocument[]> {
    return this.podcastModel.find().sort({ title: 1 }).exec();
  }

  async findById(id: string): Promise<PodcastDocument> {
    const podcast = await this.podcastModel.findById(id).exec();
    if (!podcast) throw new NotFoundException('Podcast no encontrado');
    return podcast;
  }

  /**
   * Subscribe to a podcast by URL (iVoox page URL or direct RSS feed URL).
   * 1. If it's an iVoox URL, scrape to get RSS feed URL
   * 2. Parse the RSS feed
   * 3. Save podcast + episodes to DB
   */
  async subscribe(url: string): Promise<PodcastDocument> {
    let rssFeedUrl: string;
    let ivooxUrl: string;
    let ivooxId: string;

    if (url.includes('feeds.ivoox.com') || url.endsWith('.xml')) {
      // Direct RSS feed URL
      rssFeedUrl = url;
      ivooxId = this.scraperService.extractIvooxId(url);
      ivooxUrl = `https://www.ivoox.com/podcast_sq_f${ivooxId}_1.html`;
    } else if (url.includes('ivoox.com')) {
      // iVoox podcast page URL - scrape to get RSS
      const scraped = await this.scraperService.scrapePodcastPage(url);
      if (!scraped.rssFeedUrl) {
        throw new BadRequestException('No se pudo encontrar el feed RSS de este podcast');
      }
      rssFeedUrl = scraped.rssFeedUrl;
      ivooxUrl = url;
      ivooxId = scraped.ivooxId;
    } else {
      throw new BadRequestException('URL no válida. Usa una URL de iVoox o un feed RSS.');
    }

    // Check if already subscribed
    const existing = await this.podcastModel.findOne({ ivooxId }).exec();
    if (existing) {
      return existing;
    }

    // Parse the RSS feed
    const feed = await this.rssParserService.parseFeed(rssFeedUrl);

    // Create podcast
    const podcast = await this.podcastModel.create({
      title: feed.title,
      description: feed.description,
      author: feed.author,
      imageUrl: feed.imageUrl,
      ivooxUrl,
      rssFeedUrl,
      ivooxId,
      category: feed.category,
      language: feed.language,
      lastFetchedAt: new Date(),
      episodeCount: feed.episodes.length,
    });

    // Save episodes
    if (feed.episodes.length > 0) {
      await this.episodesService.upsertMany(podcast._id.toString(), feed.episodes);
    }

    this.logger.log(`Subscribed to podcast: ${feed.title} (${feed.episodes.length} episodes)`);
    return podcast;
  }

  async unsubscribe(podcastId: string): Promise<void> {
    const podcast = await this.podcastModel.findById(podcastId).exec();
    if (!podcast) throw new NotFoundException('Podcast no encontrado');

    await this.episodesService.deleteByPodcast(podcastId);
    await this.podcastModel.findByIdAndDelete(podcastId).exec();
    this.logger.log(`Unsubscribed from podcast: ${podcast.title}`);
  }

  async refreshFeed(podcastId: string): Promise<PodcastDocument> {
    const podcast = await this.findById(podcastId);

    try {
      const feed = await this.rssParserService.parseFeed(podcast.rssFeedUrl);

      // Update podcast metadata
      podcast.title = feed.title || podcast.title;
      podcast.description = feed.description || podcast.description;
      podcast.imageUrl = feed.imageUrl || podcast.imageUrl;
      podcast.lastFetchedAt = new Date();

      // Upsert episodes (only new ones will be created)
      const newCount = await this.episodesService.upsertMany(podcastId, feed.episodes);
      podcast.episodeCount = await this.episodesService.countByPodcast(podcastId);

      await podcast.save();

      if (newCount > 0) {
        this.logger.log(`Refreshed ${podcast.title}: ${newCount} new episodes`);
      }

      return podcast;
    } catch (error) {
      this.logger.error(`Error refreshing feed for ${podcast.title}: ${error.message}`);
      throw error;
    }
  }

  async refreshAllFeeds(): Promise<void> {
    const podcasts = await this.podcastModel.find().exec();
    this.logger.log(`Refreshing ${podcasts.length} podcast feeds...`);

    for (const podcast of podcasts) {
      try {
        await this.refreshFeed(podcast._id.toString());
      } catch (error) {
        this.logger.error(`Failed to refresh ${podcast.title}: ${error.message}`);
      }
    }
  }

  async search(query: string) {
    return this.scraperService.searchPodcasts(query);
  }
}
