const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/apps/api/src/app/app.module');
const { EpisodesService } = require('./dist/apps/api/src/episodes/episodes.service');

async function main() {
  // Since NestJS may require ts-node to run from src, we can run against the compiled dist directory
  // or we can bootstrap the AppModule from the source code if we use ts-node.
  // Wait, let's see if we can bootstrap using ts-node or if NestJS has ts-node configured.
  console.log('Bootstrapping...');
}
main();
