import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProxyController } from './proxy.controller';
import { EpisodesModule } from '../episodes/episodes.module';

@Module({
  imports: [
    EpisodesModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'mypodcast-secret-dev',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [ProxyController],
})
export class ProxyModule {}
