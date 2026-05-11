import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PodcastsService } from './podcasts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('podcasts')
export class PodcastsController {
  constructor(private podcastsService: PodcastsService) {}

  @Get()
  async findAll() {
    const podcasts = await this.podcastsService.findAll();
    return { success: true, data: podcasts };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const podcast = await this.podcastsService.findById(id);
    return { success: true, data: podcast };
  }

  @Post('subscribe')
  async subscribe(@Body() body: { url: string }) {
    const podcast = await this.podcastsService.subscribe(body.url);
    return { success: true, data: podcast, message: `Suscrito a ${podcast.title}` };
  }

  @Delete(':id')
  async unsubscribe(@Param('id') id: string) {
    await this.podcastsService.unsubscribe(id);
    return { success: true, message: 'Suscripción eliminada' };
  }

  @Post('search')
  async search(@Body() body: { query: string }) {
    const results = await this.podcastsService.search(body.query);
    return { success: true, data: results };
  }

  @Post(':id/refresh')
  async refresh(@Param('id') id: string) {
    const podcast = await this.podcastsService.refreshFeed(id);
    return { success: true, data: podcast, message: 'Feed actualizado' };
  }
}
