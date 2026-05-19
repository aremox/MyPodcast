import { NestFactory } from '@nestjs/core';
import { AppModule } from './apps/api/src/app/app.module.ts';
import { EpisodesService } from './apps/api/src/episodes/episodes.service.ts';
import { Types } from 'mongoose';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('NestJS Application Context Bootstrapped!');

  const episodesService = app.get(EpisodesService);
  const podcastIdStr = '6a0c1cbee6d5ea4a4431979b';

  // 1. Query via episodesService.findByPodcast
  console.log('--- Calling findByPodcast with string ---');
  try {
    const resString = await episodesService.findByPodcast(podcastIdStr);
    console.log('Result length:', resString.episodes.length, 'Total count:', resString.total);
  } catch (err) {
    console.error('Failed to run findByPodcast:', err);
  }

  // 2. Let's inspect the episodeModel from episodesService
  console.log('--- Querying episodeModel directly ---');
  const model = (episodesService as any).episodeModel;
  console.log('Model name:', model.modelName);

  const epsWithString = await model.find({ podcastId: podcastIdStr }).limit(5);
  console.log('Direct query with string: found', epsWithString.length);

  const epsWithObjectId = await model.find({ podcastId: new Types.ObjectId(podcastIdStr) }).limit(5);
  console.log('Direct query with ObjectId: found', epsWithObjectId.length);

  await app.close();
}

main().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
