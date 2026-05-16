import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Episode, EpisodeDocument } from './schemas/episode.schema';
import { ParsedEpisode } from '../podcasts/rss-parser.service';

@Injectable()
export class EpisodesService {
  private readonly logger = new Logger(EpisodesService.name);

  constructor(
    @InjectModel(Episode.name) private episodeModel: Model<EpisodeDocument>,
  ) {}

  async findByPodcast(podcastId: string, page = 1, limit = 50): Promise<{ episodes: EpisodeDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [episodes, total] = await Promise.all([
      this.episodeModel
        .find({ podcastId })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.episodeModel.countDocuments({ podcastId }).exec(),
    ]);
    return { episodes, total };
  }

  async findAllIdsByPodcast(podcastId: string): Promise<string[]> {
    const episodes = await this.episodeModel
      .find({ podcastId })
      .select('_id')
      .exec();
    return episodes.map(e => e._id.toString());
  }

  async findById(id: string): Promise<EpisodeDocument> {
    const episode = await this.episodeModel.findById(id).exec();
    if (!episode) throw new NotFoundException('Episodio no encontrado');
    return episode;
  }

  async findRecent(limit = 20): Promise<EpisodeDocument[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.episodeModel
      .find({ publishedAt: { $gte: sevenDaysAgo } })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate('podcastId', 'title imageUrl')
      .exec();
  }

  async countByPodcast(podcastId: string): Promise<number> {
    return this.episodeModel.countDocuments({ podcastId }).exec();
  }

  /**
   * Upsert episodes from a parsed RSS feed.
   * Uses guid as unique identifier to avoid duplicates.
   * Returns an array of newly created episode IDs.
   */
  async upsertMany(podcastId: string, parsedEpisodes: ParsedEpisode[]): Promise<string[]> {
    const newEpisodeIds: string[] = [];

    for (const ep of parsedEpisodes) {
      // First, try to find the episode to see if it's really new
      const existing = await this.episodeModel.findOne({ guid: ep.guid }).select('_id').exec();
      
      if (!existing) {
        // If it doesn't exist, create it
        const newEpisode = await this.episodeModel.create({
          podcastId: new Types.ObjectId(podcastId),
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          imageUrl: ep.imageUrl,
          duration: ep.duration,
          durationSeconds: ep.durationSeconds,
          publishedAt: ep.publishedAt,
          guid: ep.guid,
          ivooxUrl: ep.ivooxUrl,
          fileSize: ep.fileSize,
        });
        newEpisodeIds.push(newEpisode._id.toString());
      } else {
        // If it exists, update it (optional, to keep metadata fresh)
        await this.episodeModel.updateOne(
          { _id: existing._id },
          {
            $set: {
              audioUrl: ep.audioUrl,
              duration: ep.duration,
              durationSeconds: ep.durationSeconds,
              imageUrl: ep.imageUrl,
            }
          }
        ).exec();
      }
    }

    return newEpisodeIds;
  }

  async deleteByPodcast(podcastId: string): Promise<void> {
    await this.episodeModel.deleteMany({ podcastId }).exec();
  }

  async search(query: string, podcastId?: string): Promise<EpisodeDocument[]> {
    const filter: any = {
      $text: { $search: query },
    };
    if (podcastId) {
      filter.podcastId = podcastId;
    }

    return this.episodeModel
      .find(filter)
      .sort({ publishedAt: -1 })
      .limit(50)
      .exec();
  }
}
