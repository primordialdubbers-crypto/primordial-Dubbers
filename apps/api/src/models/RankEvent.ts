import mongoose, { Document, Model, Schema } from 'mongoose';
import { RankTier } from '@pdi/shared';

export interface IRankEvent extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  oldRank: RankTier;
  newRank: RankTier;
  pointsAtEvent: number;
  triggeringTransactionId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const rankEventSchema = new Schema<IRankEvent>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    oldRank: {
      type: String,
      enum: ['ED', 'C', 'B', 'A', 'S'],
      required: true,
    },
    newRank: {
      type: String,
      enum: ['ED', 'C', 'B', 'A', 'S'],
      required: true,
    },
    pointsAtEvent: {
      type: Number,
      required: true,
      min: 0,
    },
    triggeringTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'PointTransaction',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

rankEventSchema.index({ studentId: 1, createdAt: -1 });

export const RankEvent: Model<IRankEvent> =
  mongoose.models.RankEvent || mongoose.model<IRankEvent>('RankEvent', rankEventSchema);
