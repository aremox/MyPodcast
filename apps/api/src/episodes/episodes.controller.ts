import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EpisodesService } from './episodes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('episodes')
export class EpisodesController {
  constructor(private episodesService: EpisodesService) {}

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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const episode = await this.episodesService.findById(id);
    return { success: true, data: episode };
  }
}
