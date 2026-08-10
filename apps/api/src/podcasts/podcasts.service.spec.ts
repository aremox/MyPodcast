import { Test, TestingModule } from '@nestjs/testing';
import { PodcastsService } from './podcasts.service';
import { CronService } from './cron.service';
import { getModelToken } from '@nestjs/mongoose';
import { RssParserService } from './rss-parser.service';
import { ScraperService } from './scraper.service';
import { EpisodesService } from '../episodes/episodes.service';
import { LibraryService } from '../library/library.service';
import { Types } from 'mongoose';

describe('CronService & PodcastsService - Feed Auto Refresh & Queue Sync', () => {
  let cronService: CronService;
  let podcastsService: PodcastsService;
  let rssParserService: jest.Mocked<Partial<RssParserService>>;
  let episodesService: jest.Mocked<Partial<EpisodesService>>;
  let libraryService: jest.Mocked<Partial<LibraryService>>;
  let podcastModel: any;

  const mockPodcast = {
    _id: new Types.ObjectId(),
    title: 'Test Podcast',
    description: 'Test Description',
    rssFeedUrl: 'https://feed.test.com/rss.xml',
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    rssParserService = {
      parseFeed: jest.fn().mockResolvedValue({
        title: 'Test Podcast',
        description: 'Test Description',
        imageUrl: 'http://img.test',
        episodes: [
          { title: 'Episodio Nuevo 1', guid: 'ep1', audioUrl: 'http://audio1.mp3' },
          { title: 'Episodio Nuevo 2', guid: 'ep2', audioUrl: 'http://audio2.mp3' }
        ],
      }),
    };

    episodesService = {
      upsertMany: jest.fn().mockResolvedValue(['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']),
      countByPodcast: jest.fn().mockResolvedValue(2),
    };

    libraryService = {
      getSubscribedUserIds: jest.fn().mockResolvedValue(['user-id-1', 'user-id-2']),
      addEpisodesToUserQueues: jest.fn().mockResolvedValue(undefined),
    };

    podcastModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockPodcast]),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPodcast),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        PodcastsService,
        { provide: getModelToken('Podcast'), useValue: podcastModel },
        { provide: RssParserService, useValue: rssParserService },
        { provide: ScraperService, useValue: {} },
        { provide: EpisodesService, useValue: episodesService },
        { provide: LibraryService, useValue: libraryService },
      ],
    }).compile();

    cronService = module.get<CronService>(CronService);
    podcastsService = module.get<PodcastsService>(PodcastsService);
  });

  it('should be defined', () => {
    expect(cronService).toBeDefined();
    expect(podcastsService).toBeDefined();
  });

  describe('handleFeedRefresh', () => {
    it('should refresh feeds and automatically add new episode IDs to subscribed users queues', async () => {
      await cronService.handleFeedRefresh();

      expect(podcastModel.find).toHaveBeenCalled();
      expect(rssParserService.parseFeed).toHaveBeenCalledWith(mockPodcast.rssFeedUrl);
      expect(episodesService.upsertMany).toHaveBeenCalled();
      expect(libraryService.getSubscribedUserIds).toHaveBeenCalledWith(mockPodcast._id.toString());
      expect(libraryService.addEpisodesToUserQueues).toHaveBeenCalledWith(
        ['user-id-1', 'user-id-2'],
        ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
      );
    });
  });
});
