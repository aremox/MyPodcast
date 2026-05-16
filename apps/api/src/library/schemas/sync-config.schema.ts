import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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
}

export const SyncConfigSchema = SchemaFactory.createForClass(SyncConfig);
