import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayHistoryDocument = PlayHistory & Document;

@Schema({ timestamps: true })
export class PlayHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Episode', required: true })
  episodeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Podcast', required: true })
  podcastId: Types.ObjectId;

  @Prop({ default: 0 })
  progress: number; // seconds played

  @Prop({ default: false })
  completed: boolean;

  @Prop({ default: Date.now })
  lastPlayedAt: Date;
}

export const PlayHistorySchema = SchemaFactory.createForClass(PlayHistory);
PlayHistorySchema.index({ userId: 1, episodeId: 1 }, { unique: true });
PlayHistorySchema.index({ userId: 1, lastPlayedAt: -1 });
