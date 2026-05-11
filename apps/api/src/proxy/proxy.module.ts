import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { EpisodesModule } from '../episodes/episodes.module';

@Module({
  imports: [EpisodesModule],
  controllers: [ProxyController],
})
export class ProxyModule {}
