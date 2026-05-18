import { Controller, Get, Param, Query, Req, Res, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EpisodesService } from '../episodes/episodes.service';
import { cleanIvooxUrl } from '../episodes/ivoox.utils';
import * as fs from 'fs';
import * as path from 'path';

@Controller('proxy')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(
    private episodesService: EpisodesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Proxy audio streams from iVoox.
   * Supports byte-range requests for seeking in the player.
   * Accepts JWT either as Authorization header OR as ?token= query param
   * (the native <audio> element cannot set custom headers).
   */
  @Get('audio/:episodeId')
  async streamAudio(
    @Param('episodeId') episodeId: string,
    @Query('token') tokenParam: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Verify JWT from header OR query param
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');
    const token = bearerToken || tokenParam;
    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    try {
      await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'mypodcast-super-secret-key-dev'),
      });
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    try {
      const episode = await this.episodesService.findById(episodeId);
      if (!episode || !episode.audioUrl) {
        return res.status(404).json({ error: 'Audio no encontrado' });
      }

      // Check if we have a fully downloaded local copy of the episode's audio
      const localFilePath = path.join(process.cwd(), 'downloads', `${episodeId}.mp3`);
      if (fs.existsSync(localFilePath)) {
        this.logger.log(`Serving downloaded audio file locally for episode ${episodeId}`);
        // Express res.sendFile automatically handles byte-range requests, 206 Partial Content, seeking, etc.
        // It is highly robust and performs beautifully.
        return res.sendFile(localFilePath);
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.ivoox.com/',
        'Accept': '*/*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
      };

      // Forward Range header for seeking support
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const downloadUrl = cleanIvooxUrl(episode.audioUrl);
      const response = await axios.get(downloadUrl, {
        headers,
        responseType: 'stream',
        timeout: 30000,
        validateStatus: () => true, // Don't throw on 4xx/5xx to handle them manually
      });

      this.logger.log(`Proxy response for ${episodeId}: ${response.status} ${response.statusText}`);

      // Forward relevant headers
      res.status(response.status);

      if (response.headers['content-type']) {
        res.setHeader('Content-Type', String(response.headers['content-type']));
      }
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', String(response.headers['content-length']));
      }
      if (response.headers['content-range']) {
        res.setHeader('Content-Range', String(response.headers['content-range']));
      }
      if (response.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', String(response.headers['accept-ranges']));
      }

      // Allow caching by the Service Worker
      res.setHeader('Cache-Control', 'public, max-age=86400');

      response.data.pipe(res);

      req.on('close', () => {
        if (!response.data.destroyed) {
          response.data.destroy();
        }
      });
    } catch (error) {
      this.logger.error(`Proxy exception for episode ${episodeId}: ${error.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Error al obtener el audio', details: error.message });
      }
    }
  }
}
