import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlayHistory, PlayHistorySchema } from './schemas/play-history.schema';
import { Favorite, FavoriteSchema } from './schemas/favorite.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlayHistory.name, schema: PlayHistorySchema },
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
