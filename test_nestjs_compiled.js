const { NestFactory } = require('@nestjs/core');
const path = require('path');

// Let's resolve the path to the compiled AppModule in dist
const appModulePath = path.resolve(__dirname, 'dist/apps/api/src/app/app.module.js');
const episodesServicePath = path.resolve(__dirname, 'dist/apps/api/src/episodes/episodes.service.js');

async function main() {
  console.log('Loading compiled AppModule from:', appModulePath);
  const { AppModule } = require(appModulePath);
  const { EpisodesService } = require(episodesServicePath);
  const { Types } = require('mongoose');

  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('NestJS Application Context Bootstrapped!');

  const episodesService = app.get(EpisodesService);
  const podcastIdStr = '6a0c1cbee6d5ea4a4431979b';

  console.log('--- Calling findByPodcast with string ---');
  try {
    const resString = await episodesService.findByPodcast(podcastIdStr);
    console.log('Result length:', resString.episodes.length, 'Total count:', resString.total);
  } catch (err) {
    console.error('Failed to run findByPodcast:', err);
  }

  console.log('--- Querying episodeModel directly ---');
  const model = episodesService.episodeModel;
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
