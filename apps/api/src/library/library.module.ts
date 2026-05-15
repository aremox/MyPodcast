import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
    forwardRef(() => EpisodesModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
