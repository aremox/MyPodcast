import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Podcast, PodcastSchema } from './schemas/podcast.schema';
import { PodcastsService } from './podcasts.service';
import { PodcastsController } from './podcasts.controller';
import { RssParserService } from './rss-parser.service';
import { ScraperService } from './scraper.service';
import { CronService } from './cron.service';
import { EpisodesModule } from '../episodes/episodes.module';
import { LibraryModule } from '../library/library.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Podcast.name, schema: PodcastSchema }]),
    forwardRef(() => EpisodesModule),
    forwardRef(() => LibraryModule),
  ],
  controllers: [PodcastsController],
  providers: [PodcastsService, RssParserService, ScraperService, CronService],
  exports: [PodcastsService],
})
export class PodcastsModule {}
