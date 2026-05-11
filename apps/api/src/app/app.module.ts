import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PodcastsModule } from '../podcasts/podcasts.module';
import { EpisodesModule } from '../episodes/episodes.module';
import { LibraryModule } from '../library/library.module';
import { ProxyModule } from '../proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/mypodcast'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    PodcastsModule,
    EpisodesModule,
    LibraryModule,
    ProxyModule,
  ],
})
export class AppModule {}
