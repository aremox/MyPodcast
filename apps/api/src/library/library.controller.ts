import { Controller, Get, Post, Delete, Param, Body, Query, Request, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { EpisodesService } from '../episodes/episodes.service';

@Controller('library')
export class LibraryController {
  constructor(
    private libraryService: LibraryService,
    @Inject(forwardRef(() => EpisodesService)) private episodesService: EpisodesService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
  ) {}

  // ===== SUBSCRIPTIONS =====

  @UseGuards(JwtAuthGuard)
  @Get('subscriptions')
  async getSubscriptions(@Request() req: any) {
    const subs = await this.libraryService.getUserSubscriptions(req.user.userId);
    return { success: true, data: subs };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscriptions/:podcastId')
  async subscribe(@Request() req: any, @Param('podcastId') podcastId: string) {
    const sub = await this.libraryService.subscribe(req.user.userId, podcastId);
    return { success: true, data: sub };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subscriptions/:podcastId')
  async unsubscribe(@Request() req: any, @Param('podcastId') podcastId: string) {
    await this.libraryService.unsubscribe(req.user.userId, podcastId);
    return { success: true, message: 'Suscripción eliminada' };
  }

  // ===== FAVORITES =====

  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  async getFavorites(@Request() req: any) {
    const favs = await this.libraryService.getUserFavorites(req.user.userId);
    return { success: true, data: favs };
  }

  @UseGuards(JwtAuthGuard)
  @Post('favorites/:episodeId')
  async addFavorite(@Request() req: any, @Param('episodeId') episodeId: string) {
    const fav = await this.libraryService.addFavorite(req.user.userId, episodeId);
    return { success: true, data: fav };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('favorites/:episodeId')
  async removeFavorite(@Request() req: any, @Param('episodeId') episodeId: string) {
    await this.libraryService.removeFavorite(req.user.userId, episodeId);
    return { success: true, message: 'Eliminado de favoritos' };
  }

  // ===== HISTORY =====

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Get('in-progress')
  async getInProgress(@Request() req: any) {
    const episodes = await this.libraryService.getInProgressEpisodes(req.user.userId);
    return { success: true, data: episodes };
  }

  @UseGuards(JwtAuthGuard)
  @Get('progress/:episodeId')
  async getEpisodeProgress(@Request() req: any, @Param('episodeId') episodeId: string) {
    const progress = await this.libraryService.getEpisodeProgress(req.user.userId, episodeId);
    return { success: true, data: progress };
  }

  @UseGuards(JwtAuthGuard)
  @Get('podcast/:podcastId/progress')
  async getPodcastProgress(@Request() req: any, @Param('podcastId') podcastId: string) {
    const completedEpisodes = await this.libraryService.getPodcastProgress(req.user.userId, podcastId);
    return { success: true, data: completedEpisodes };
  }

  @UseGuards(JwtAuthGuard)
  @Post('podcast/:podcastId/mark-all')
  async markAllPodcastProgress(
    @Request() req: any,
    @Param('podcastId') podcastId: string,
    @Body() body: { completed: boolean }
  ) {
    let episodeIds: string[] = [];
    if (body.completed) {
      episodeIds = await this.episodesService.findAllIdsByPodcast(podcastId);
    }
    await this.libraryService.markAllAsCompleted(req.user.userId, podcastId, body.completed, episodeIds);
    return { success: true, message: body.completed ? 'Marcados como escuchados' : 'Desmarcados' };
  }

  // ===== SYNC CONFIG =====

  @UseGuards(JwtAuthGuard)
  @Get('sync-config')
  async getSyncConfig(@Request() req: any) {
    const config = await this.libraryService.getSyncConfig(req.user.userId);
    return { success: true, data: config };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-config')
  async saveSyncConfig(@Request() req: any, @Body() body: { targetUsbSerial: string; targetFolder: string }) {
    const config = await this.libraryService.saveSyncConfig(req.user.userId, body.targetUsbSerial, body.targetFolder);
    return { success: true, data: config };
  }

  @UseGuards(JwtAuthGuard)
  @Post('pair/generate')
  async generatePairingCode(@Request() req: any) {
    const code = await this.libraryService.generatePairingCode(req.user.userId);
    return { success: true, code };
  }

  @Post('pair/validate')
  async validatePairingCode(@Body() body: { code: string }) {
    const userId = await this.libraryService.validatePairingCode(body.code);
    if (!userId) {
      return { success: false, message: 'Código inválido o expirado' };
    }
    const authData = await this.authService.loginById(userId);
    return { success: true, ...authData };
  }
}
