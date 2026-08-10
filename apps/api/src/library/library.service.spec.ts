import { Test, TestingModule } from '@nestjs/testing';
import { LibraryService } from './library.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EpisodeDownloaderService } from '../episodes/episode-downloader.service';
import { EpisodesService } from '../episodes/episodes.service';

describe('LibraryService - Pairing & Queue Integrity', () => {
  let service: LibraryService;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let syncConfigModel: any;

  beforeEach(async () => {
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-desktop-token'),
    };

    syncConfigModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        { provide: getModelToken('SyncConfig'), useValue: syncConfigModel },
        { provide: getModelToken('Subscription'), useValue: {} },
        { provide: getModelToken('Favorite'), useValue: {} },
        { provide: getModelToken('PlayHistory'), useValue: {} },
        { provide: getModelToken('Episode'), useValue: {} },
        { provide: getModelToken('User'), useValue: {} },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
        { provide: EpisodeDownloaderService, useValue: { triggerDownloads: jest.fn() } },
        { provide: EpisodesService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDesktopTokens', () => {
    it('should generate dedicated desktop tokens and save refreshToken expiration', async () => {
      syncConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      const validObjectId = '507f1f77bcf86cd799439011';
      const result = await service.generateDesktopTokens(validObjectId, 'user@test.com', 'usuario');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('desktopRefreshToken');
      expect(syncConfigModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
