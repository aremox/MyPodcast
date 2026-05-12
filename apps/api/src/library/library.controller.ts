import { Controller, Get, Post, Delete, Param, Body, Query, Request, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EpisodesService } from '../episodes/episodes.service';

@UseGuards(JwtAuthGuard)
@Controller('library')
export class LibraryController {
  constructor(
    private libraryService: LibraryService,
    @Inject(forwardRef(() => EpisodesService)) private episodesService: EpisodesService,
  ) {}

  // ===== SUBSCRIPTIONS =====

  @Get('subscriptions')
  async getSubscriptions(@Request() req: any) {
    const subs = await this.libraryService.getUserSubscriptions(req.user.userId);
    return { success: true, data: subs };
  }

  @Post('subscriptions/:podcastId')
  async subscribe(@Request() req: any, @Param('podcastId') podcastId: string) {
    const sub = await this.libraryService.subscribe(req.user.userId, podcastId);
    return { success: true, data: sub };
  }

  @Delete('subscriptions/:podcastId')
  async unsubscribe(@Request() req: any, @Param('podcastId') podcastId: string) {
    await this.libraryService.unsubscribe(req.user.userId, podcastId);
    return { success: true, message: 'Suscripción eliminada' };
  }

  // ===== FAVORITES =====

  @Get('favorites')
  async getFavorites(@Request() req: any) {
    const favs = await this.libraryService.getUserFavorites(req.user.userId);
    return { success: true, data: favs };
  }

  @Post('favorites/:episodeId')
  async addFavorite(@Request() req: any, @Param('episodeId') episodeId: string) {
    const fav = await this.libraryService.addFavorite(req.user.userId, episodeId);
    return { success: true, data: fav };
  }

  @Delete('favorites/:episodeId')
  async removeFavorite(@Request() req: any, @Param('episodeId') episodeId: string) {
    await this.libraryService.removeFavorite(req.user.userId, episodeId);
    return { success: true, message: 'Eliminado de favoritos' };
  }

  // ===== HISTORY =====

  @Get('history')
  async getHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.libraryService.getHistory(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data: result.history, total: result.total };
  }

  @Post('history')
  async updateProgress(
    @Request() req: any,
    @Body() body: { episodeId: string; podcastId: string; progress: number; completed: boolean },
  ) {
    const entry = await this.libraryService.updateProgress(
      req.user.userId,
      body.episodeId,
      body.podcastId,
      body.progress,
      body.completed,
    );
    return { success: true, data: entry };
  }

  @Get('in-progress')
  async getInProgress(@Request() req: any) {
    const episodes = await this.libraryService.getInProgressEpisodes(req.user.userId);
    return { success: true, data: episodes };
  }

  @Get('progress/:episodeId')
  async getEpisodeProgress(@Request() req: any, @Param('episodeId') episodeId: string) {
    const progress = await this.libraryService.getEpisodeProgress(req.user.userId, episodeId);
    return { success: true, data: progress };
  }

  @Get('podcast/:podcastId/progress')
  async getPodcastProgress(@Request() req: any, @Param('podcastId') podcastId: string) {
    const completedEpisodes = await this.libraryService.getPodcastProgress(req.user.userId, podcastId);
    return { success: true, data: completedEpisodes };
  }

  @Post('podcast/:podcastId/mark-all')
  async markAllPodcastProgress(
    @Request() req: any,
    @Param('podcastId') podcastId: string,
    @Body() body: { completed: boolean }
  ) {
    let episodeIds: string[] = [];
    if (body.completed) {
      // Import the episode service and call it
      // Wait, LibraryController needs EpisodesService!
      episodeIds = await this.episodesService.findAllIdsByPodcast(podcastId);
    }
    await this.libraryService.markAllAsCompleted(req.user.userId, podcastId, body.completed, episodeIds);
    return { success: true, message: body.completed ? 'Marcados como escuchados' : 'Desmarcados' };
  }
}
