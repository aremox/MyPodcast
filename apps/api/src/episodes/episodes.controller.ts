import { Controller, Get, Param, Query, Post, Body, UseGuards } from '@nestjs/common';
import { EpisodesService } from './episodes.service';
import { EpisodeDownloaderService } from './episode-downloader.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

@UseGuards(JwtAuthGuard)
@Controller('episodes')
export class EpisodesController {
  constructor(
    private episodesService: EpisodesService,
    private downloaderService: EpisodeDownloaderService,
  ) {}

  @Get('recent')
  async findRecent(@Query('limit') limit?: string) {
    const episodes = await this.episodesService.findRecent(
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data: episodes };
  }

  @Get('podcast/:podcastId')
  async findByPodcast(
    @Param('podcastId') podcastId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.episodesService.findByPodcast(
      podcastId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
    return {
      success: true,
      data: result.episodes,
      total: result.total,
    };
  }

  /**
   * Triggers server-side background downloads for a list of episode IDs.
   * Returns immediately; downloads happen in the background sequentially.
   */
  @Post('download-batch')
  async downloadBatch(@Body() body: { episodeIds: string[] }) {
    const { episodeIds } = body;
    if (!episodeIds || !Array.isArray(episodeIds) || episodeIds.length === 0) {
      return { success: false, error: 'episodeIds array is required' };
    }
    this.downloaderService.triggerDownloads(episodeIds);
    return { success: true, queued: episodeIds.length };
  }

  /**
   * Returns which episode IDs from a given list are already downloaded server-side.
   * The frontend uses this to sync local "downloaded" state.
   */
  @Post('download-status')
  async downloadStatus(@Body() body: { episodeIds: string[] }) {
    const { episodeIds } = body;
    if (!episodeIds || !Array.isArray(episodeIds)) {
      return { success: false, error: 'episodeIds array is required' };
    }
    const downloadsDir = path.join(process.cwd(), 'downloads');
    const downloaded: string[] = [];
    const pending: string[] = [];

    for (const id of episodeIds) {
      const filePath = path.join(downloadsDir, `${id}.mp3`);
      if (fs.existsSync(filePath)) {
        downloaded.push(id);
      } else {
        pending.push(id);
      }
    }

    return { success: true, downloaded, pending };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const episode = await this.episodesService.findById(id);
    return { success: true, data: episode };
  }
}
