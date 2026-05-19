import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedPodcastInfo {
  title: string;
  description: string;
  imageUrl: string;
  rssFeedUrl: string;
  ivooxId: string;
  author: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  /**
   * Scrapes a podcast page from iVoox and extracts the RSS feed URL and metadata.
   * Uses cheerio (no headless browser) for speed and simplicity.
   */
  async scrapePodcastPage(ivooxUrl: string): Promise<ScrapedPodcastInfo> {
    try {
      this.logger.log(`Scraping iVoox page: ${ivooxUrl}`);

      // Support for episode URLs: if the URL represents an episode (contains '_rf_')
      if (ivooxUrl.includes('_rf_')) {
        this.logger.log(`Detected iVoox episode URL: ${ivooxUrl}. Resolving to parent podcast...`);
        const epResponse = await axios.get(ivooxUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9',
          },
          timeout: 15000,
        });
        const $ep = cheerio.load(epResponse.data);
        
        let parentPath = '';
        $ep('a[href*="_sq_f"]').each((_, el) => {
          const $el = $ep(el);
          // Exclude header components to avoid picking up trending podcasts like "V9 - Fórmula 1"
          if ($el.closest('#header-wrapper, .bg-lightest, header').length > 0) {
            return true; // continue
          }
          parentPath = $el.attr('href') || '';
          if (parentPath) return false; // break loop on first match
        });

        if (parentPath) {
          const parentUrl = parentPath.startsWith('http') ? parentPath : `https://www.ivoox.com${parentPath}`;
          this.logger.log(`Successfully resolved episode URL to parent podcast: ${parentUrl}`);
          ivooxUrl = parentUrl;
        } else {
          this.logger.warn(`Could not resolve parent podcast URL from episode page: ${ivooxUrl}`);
        }
      }

      const response = await axios.get(ivooxUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract RSS feed URL from the page
      // iVoox pages have links to feeds.ivoox.com/feed_fg_f{ID}_filtro_1.xml
      let rssFeedUrl = '';

      // Method 1: Look for direct RSS link
      $('a[href*="feeds.ivoox.com/feed_fg"]').each((_, el) => {
        rssFeedUrl = $(el).attr('href') || '';
      });

      // Method 2: Look for link rel alternate
      if (!rssFeedUrl) {
        $('link[type="application/rss+xml"]').each((_, el) => {
          rssFeedUrl = $(el).attr('href') || '';
        });
      }

      // Method 3: Extract the ID from the URL and construct feed URL
      if (!rssFeedUrl) {
        const ivooxId = this.extractIvooxId(ivooxUrl);
        if (ivooxId) {
          rssFeedUrl = `https://feeds.ivoox.com/feed_fg_f${ivooxId}_filtro_1.xml`;
        }
      }

      // Extract metadata
      const title = $('meta[property="og:title"]').attr('content') ||
        $('title').text().replace(' - Podcast en iVoox', '').trim();

      const description = $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') || '';

      const imageUrl = $('meta[property="og:image"]').attr('content') || '';

      const author = $('a[href*="_a8_podcaster_"]').first().text().trim() || '';

      const ivooxId = this.extractIvooxId(ivooxUrl);

      return {
        title,
        description: description.substring(0, 2000),
        imageUrl,
        rssFeedUrl,
        ivooxId,
        author,
      };
    } catch (error) {
      this.logger.error(`Error scraping ${ivooxUrl}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for podcasts on iVoox by query.
   * iVoox search uses the URL pattern: /{query}_sw_1_1.html
   * Podcast results have the class .modulo-type-programa
   */
  async searchPodcasts(query: string): Promise<{ title: string; url: string; imageUrl: string; author: string }[]> {
    try {
      // iVoox search URL: the query goes directly in the path segment
      const searchUrl = `https://www.ivoox.com/${encodeURIComponent(query)}_sw_1_1.html`;
      this.logger.log(`Searching iVoox: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const results: { title: string; url: string; imageUrl: string; author: string }[] = [];

      // Parse podcast results — they have class "modulo-type-programa"
      $('.modulo-type-programa').each((_, el) => {
        const $el = $(el);

        // Title from meta[itemprop="name"] or from the main link title attr
        const title =
          $el.find('meta[itemprop="name"]').attr('content') ||
          $el.find('a[href*="_sq_f"]').first().attr('title') ||
          $el.find('.content a').first().text().trim() ||
          '';

        // URL from meta[itemprop="url"] or from the podcast link
        let url =
          $el.find('meta[itemprop="url"]').attr('content') ||
          $el.find('a[href*="_sq_f"]').first().attr('href') ||
          '';
        if (url && !url.startsWith('http')) {
          url = `https://www.ivoox.com${url}`;
        }

        // Image from img.main data-src (lazy loaded)
        const rawImgSrc = $el.find('img.main').attr('data-src') || $el.find('img.main').attr('src') || '';
        // Extract the actual image URL from the iVoox image proxy URL
        const imgMatch = rawImgSrc.match(/url=([^&]+)/);
        const imageUrl = imgMatch ? decodeURIComponent(imgMatch[1]) : rawImgSrc;

        // Author from the user profile link
        const author = $el.find('a[href*="_a8_"]').attr('title') || '';

        if (url && title && !results.find(r => r.url === url)) {
          results.push({ title, url, imageUrl, author });
        }
      });

      return results.slice(0, 20);
    } catch (error) {
      this.logger.error(`Error searching iVoox: ${error.message}`);
      return [];
    }
  }

  /**
   * Extracts the iVoox podcast ID from a URL.
   * URL pattern: https://www.ivoox.com/podcast-xxxxx_sq_f{ID}_1.html
   */
  extractIvooxId(url: string): string {
    const match = url.match(/_sq_f(\d+)_/);
    if (match) return match[1];

    // Also handle feed URLs: feed_fg_f{ID}_filtro_1.xml
    const feedMatch = url.match(/feed_fg_f(\d+)_/);
    if (feedMatch) return feedMatch[1];

    return '';
  }
}
