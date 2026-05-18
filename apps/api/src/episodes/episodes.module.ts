import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Episode, EpisodeSchema } from './schemas/episode.schema';
import { EpisodesService } from './episodes.service';
import { EpisodesController } from './episodes.controller';
import { EpisodeDownloaderService } from './episode-downloader.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Episode.name, schema: EpisodeSchema }]),
  ],
  controllers: [EpisodesController],
  providers: [EpisodesService, EpisodeDownloaderService],
  exports: [EpisodesService, EpisodeDownloaderService],
})
export class EpisodesModule {}
