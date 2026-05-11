import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Parser = require('rss-parser');

export interface ParsedFeed {
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  language: string;
  category: string;
  episodes: ParsedEpisode[];
}

export interface ParsedEpisode {
  title: string;
  description: string;
  audioUrl: string;
  imageUrl?: string;
  duration: string;
  durationSeconds: number;
  publishedAt: Date;
  guid: string;
  ivooxUrl: string;
  fileSize: number;
}

@Injectable()
export class RssParserService {
  private readonly logger = new Logger(RssParserService.name);
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['itunes:duration', 'itunesDuration'] as any,
          ['itunes:image', 'itunesImage'] as any,
          ['itunes:episodeType', 'episodeType'] as any,
        ],
        feed: [
          ['itunes:author', 'itunesAuthor'] as any,
          ['itunes:image', 'itunesImage'] as any,
          ['itunes:category', 'itunesCategory'] as any,
        ],
      },
    });
  }

  async parseFeed(feedUrl: string): Promise<ParsedFeed> {
    try {
      this.logger.log(`Parsing RSS feed: ${feedUrl}`);
      const feed = await this.parser.parseURL(feedUrl);

      const episodes: ParsedEpisode[] = (feed.items || []).map((item) => ({
        title: item.title || 'Sin título',
        description: this.cleanDescription(item.contentSnippet || item.content || ''),
        audioUrl: item.enclosure?.url || '',
        imageUrl: this.extractImageUrl(item),
        duration: item['itunesDuration'] || '00:00',
        durationSeconds: this.parseDuration(item['itunesDuration'] || '0'),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        guid: item.guid || item.link || '',
        ivooxUrl: item.link || '',
        fileSize: parseInt(String(item.enclosure?.length || '0'), 10),
      }));

      return {
        title: feed.title || 'Sin título',
        description: this.cleanDescription(feed.description || ''),
        author: feed['itunesAuthor'] || feed.creator || '',
        imageUrl: this.extractFeedImageUrl(feed),
        language: feed.language || 'es',
        category: this.extractCategory(feed),
        episodes,
      };
    } catch (error) {
      this.logger.error(`Error parsing feed ${feedUrl}: ${error.message}`);
      throw error;
    }
  }

  private extractImageUrl(item: any): string {
    if (item.itunesImage?.href) return item.itunesImage.href;
    if (item.itunesImage && typeof item.itunesImage === 'string') return item.itunesImage;
    if (item['itunes:image']?.$?.href) return item['itunes:image'].$.href;
    return '';
  }

  private extractFeedImageUrl(feed: any): string {
    if (feed.itunesImage?.href) return feed.itunesImage.href;
    if (feed.itunesImage && typeof feed.itunesImage === 'string') return feed.itunesImage;
    if (feed.image?.url) return feed.image.url;
    return '';
  }

  private extractCategory(feed: any): string {
    if (feed.itunesCategory?.text) return feed.itunesCategory.text;
    if (feed.itunesCategory && typeof feed.itunesCategory === 'string') return feed.itunesCategory;
    return '';
  }

  private cleanDescription(desc: string): string {
    return desc
      .replace(/<[^>]*>/g, '')
      .replace(/\r\n/g, '\n')
      .trim()
      .substring(0, 2000);
  }

  private parseDuration(duration: string): number {
    if (!duration) return 0;

    // Handle pure seconds
    if (/^\d+$/.test(duration)) {
      return parseInt(duration, 10);
    }

    // Handle HH:MM:SS or MM:SS
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }
}
