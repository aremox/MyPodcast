import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EpisodeDocument = Episode & Document;

@Schema({ timestamps: true })
export class Episode {
  @Prop({ type: Types.ObjectId, ref: 'Podcast', required: true, index: true })
  podcastId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  audioUrl: string;

  @Prop()
  imageUrl: string;

  @Prop()
  duration: string;

  @Prop({ default: 0 })
  durationSeconds: number;

  @Prop({ required: true, index: true })
  publishedAt: Date;

  @Prop({ required: true, unique: true })
  guid: string;

  @Prop()
  ivooxUrl: string;

  @Prop({ default: 0 })
  fileSize: number;
}

export const EpisodeSchema = SchemaFactory.createForClass(Episode);

// Compound index for efficient queries
EpisodeSchema.index({ podcastId: 1, publishedAt: -1 });
