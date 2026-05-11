import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PodcastDocument = Podcast & Document;

@Schema({ timestamps: true })
export class Podcast {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop()
  author: string;

  @Prop()
  imageUrl: string;

  @Prop({ required: true })
  ivooxUrl: string;

  @Prop({ required: true })
  rssFeedUrl: string;

  @Prop({ required: true, unique: true })
  ivooxId: string;

  @Prop()
  category: string;

  @Prop({ default: 'es' })
  language: string;

  @Prop()
  lastFetchedAt: Date;

  @Prop({ default: 0 })
  episodeCount: number;
}

export const PodcastSchema = SchemaFactory.createForClass(Podcast);
