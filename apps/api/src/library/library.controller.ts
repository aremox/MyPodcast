import { Controller, Get, Post, Delete, Param, Body, Query, Request, UseGuards, Inject, forwardRef, Logger, ForbiddenException } from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { EpisodesService } from '../episodes/episodes.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('library')
export class LibraryController {
  private readonly logger = new Logger(LibraryController.name);

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

  @UseGuards(JwtAuthGuard)
  @Post('subscriptions/:podcastId/view')
  async markAsViewed(@Request() req: any, @Param('podcastId') podcastId: string) {
    const sub = await this.libraryService.markPodcastAsViewed(req.user.userId, podcastId);
    return { success: true, data: sub };
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
    let podcastId = body.podcastId;
    // Fallback: if podcastId is missing or invalid, try to recover it from the episode
    if (!podcastId || podcastId.length !== 24) {
      try {
        const ep = await this.episodesService.findById(body.episodeId);
        if (ep && ep.podcastId) {
          podcastId = ep.podcastId.toString();
        }
      } catch (e) {
        this.logger.error(`Could not recover podcastId for episode ${body.episodeId}`);
      }
    }

    if (!podcastId || podcastId.length !== 24) {
      return { success: false, message: 'Invalid or missing podcastId' };
    }

    const entry = await this.libraryService.updateProgress(
      req.user.userId,
      body.episodeId,
      podcastId,
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
  @Get('now-playing')
  async getNowPlaying(@Request() req: any) {
    const record = await this.libraryService.getNowPlaying(req.user.userId);
    if (!record) {
      return { success: true, data: null };
    }
    const ep = record.episodeId as any;
    const podcast = ep?.podcastId as any;
    return {
      success: true,
      data: {
        episodeId: ep?._id?.toString(),
        title: ep?.title,
        audioUrl: ep?.audioUrl,
        imageUrl: ep?.imageUrl || podcast?.imageUrl,
        podcastId: podcast?._id?.toString() || ep?.podcastId?.toString(),
        podcastTitle: podcast?.title,
        podcastImageUrl: podcast?.imageUrl,
        publishedAt: ep?.publishedAt,
        durationSeconds: ep?.durationSeconds,
        progress: record.progress,
        lastPlayedAt: record.lastPlayedAt,
      },
    };
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
  @Get('podcast/:podcastId/in-progress')
  async getPodcastInProgress(@Request() req: any, @Param('podcastId') podcastId: string) {
    const progressMap = await this.libraryService.getPodcastInProgress(req.user.userId, podcastId);
    return { success: true, data: progressMap };
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

  // ===== ADMIN MULTI-DEVICE SYNC CONFIGS =====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('sync-configs')
  async getAllSyncConfigs() {
    const configs = await this.libraryService.getAllSyncConfigs();
    return { success: true, data: configs };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('sync-config/user/:userId')
  async getSyncConfigForUser(@Param('userId') userId: string) {
    const config = await this.libraryService.getSyncConfig(userId);
    return { success: true, data: config };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Post('sync-config/user/:userId')
  async saveSyncConfigForUser(@Param('userId') userId: string, @Body() body: any) {
    const config = await this.libraryService.updateSyncConfig(userId, body);
    return config;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Delete('sync-config/device/user/:userId')
  async unlinkDeviceForUser(@Param('userId') userId: string) {
    const config = await this.libraryService.unlinkDevice(userId);
    return { success: true, data: config };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Post('pair/generate/user/:userId')
  async generatePairingCodeForUser(@Param('userId') userId: string) {
    const code = await this.libraryService.generatePairingCode(userId);
    return { success: true, code };
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
  async saveSyncConfig(@Request() req: any, @Body() body: any) {
    const config = await this.libraryService.updateSyncConfig(req.user.userId, body);
    return config;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sync-config/device')
  async unlinkDevice(@Request() req: any) {
    const config = await this.libraryService.unlinkDevice(req.user.userId);
    return { success: true, data: config };
  }

  @UseGuards(JwtAuthGuard)
  @Post('queue')
  async updateQueue(@Request() req: any, @Body() body: { episodeIds: string[] }) {
    this.logger.log(`[QueueSync] DEBUG - User: ${JSON.stringify(req.user)}`);
    this.logger.log(`[QueueSync] DEBUG - Body: ${JSON.stringify(body)}`);
    
    const userId = req.user.userId || req.user.sub || req.user.id;
    const ids = body.episodeIds || [];
    
    this.logger.log(`[QueueSync] Updating queue for user ${userId} with ${ids.length} items`);
    
    await this.libraryService.updateQueue(userId, ids);
    return { success: true };
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
    // Get user info via normal login (also updates web refresh token)
    const authData = await this.authService.loginById(userId);
    // Generate dedicated desktop tokens (independent from web session)
    const desktopTokens = await this.libraryService.generateDesktopTokens(
      userId,
      authData.user.email,
      authData.user.role,
    );
    return { 
      success: true, 
      token: desktopTokens.accessToken, // Alias for legacy compatibility
      accessToken: desktopTokens.accessToken,
      desktopRefreshToken: desktopTokens.desktopRefreshToken,
      user: authData.user,
    };
  }

  @Post('pair/refresh')
  async refreshDesktopTokens(@Body() body: { refreshToken: string }) {
    const tokens = await this.libraryService.refreshDesktopTokens(body.refreshToken);
    if (!tokens) {
      return { success: false, message: 'Refresh token inválido o expirado' };
    }
    return {
      success: true,
      accessToken: tokens.accessToken,
      desktopRefreshToken: tokens.desktopRefreshToken,
    };
  }
}
