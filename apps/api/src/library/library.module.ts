import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlayHistory, PlayHistorySchema } from './schemas/play-history.schema';
import { Favorite, FavoriteSchema } from './schemas/favorite.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { SyncConfig, SyncConfigSchema } from './schemas/sync-config.schema';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { EpisodesModule } from '../episodes/episodes.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlayHistory.name, schema: PlayHistorySchema },
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SyncConfig.name, schema: SyncConfigSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'mypodcast-secret-dev',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    forwardRef(() => EpisodesModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
