const { NestFactory } = require('@nestjs/core');
const path = require('path');

const appModulePath = path.resolve(__dirname, 'dist/apps/api/src/app/app.module.js');
const podcastsServicePath = path.resolve(__dirname, 'dist/apps/api/src/podcasts/podcasts.service.js');

async function main() {
  console.log('Loading compiled AppModule from:', appModulePath);
  const { AppModule } = require(appModulePath);
  const { PodcastsService } = require(podcastsServicePath);

  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('NestJS Application Context Bootstrapped!');

  const podcastsService = app.get(PodcastsService);
  const url = 'https://www.ivoox.com/podcast-apasionados-tecnologia_sq_f11031082_1.html';

  console.log(`Subscribing to: ${url}`);
  try {
    const podcast = await podcastsService.subscribe(url);
    console.log('Successfully subscribed to podcast in production DB!');
    console.log('Podcast:', JSON.stringify(podcast, null, 2));
  } catch (err) {
    console.error('Failed to subscribe:', err.message, err.stack);
  } finally {
    await app.close();
  }
}

main().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
