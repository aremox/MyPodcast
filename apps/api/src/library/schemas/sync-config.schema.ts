import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaTypes } from 'mongoose';

export type SyncConfigDocument = SyncConfig & Document;

@Schema({ timestamps: true })
export class SyncConfig {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  targetUsbSerial: string;

  @Prop({ default: 'Podcasts' })
  targetFolder: string;

  @Prop({ default: Date.now })
  lastSyncAt: Date;

  @Prop()
  pairingCode?: string;

  @Prop()
  pairingCodeExpires?: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Episode' }], default: [] })
  queue: Types.ObjectId[];

  @Prop({ default: 60 })
  syncInterval: number;

  @Prop({ type: Number })
  usbTotalSpace?: number;

  @Prop({ type: Number })
  usbFreeSpace?: number;

  @Prop({ type: Number })
  usbPodcastsSpace?: number;

  @Prop({ type: Number })
  usbOtherSpace?: number;

  @Prop()
  usbFormat?: string;

  @Prop({ type: SchemaTypes.Mixed, default: [] })
  smartRules?: any[];

  @Prop({ type: Boolean, default: false })
  autoApplyRules?: boolean;

  @Prop({ type: Number, default: 1 })
  playbackSpeed?: number;
}


export const SyncConfigSchema = SchemaFactory.createForClass(SyncConfig);
