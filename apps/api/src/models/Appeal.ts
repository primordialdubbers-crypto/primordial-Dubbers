import mongoose, { Document, Model, Schema } from 'mongoose';
import { AppealStatus } from '@pdi/shared';

export interface IAppeal extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  reason: string;
  evidenceText?: string;
  status: AppealStatus;
  decidedBy?: mongoose.Types.ObjectId | null;
  decidedAt?: Date | null;
  decisionNote?: string;
  reversalTransactionId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const appealSchema = new Schema<IAppeal>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'PointTransaction',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    evidenceText: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'granted', 'rejected'],
      default: 'pending',
      index: true,
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    decisionNote: {
      type: String,
      default: '',
      maxlength: 500,
    },
    reversalTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'PointTransaction',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

appealSchema.index({ studentId: 1, createdAt: -1 });
appealSchema.index({ status: 1, createdAt: -1 });
// Ensure a student cannot have multiple pending appeals for the same transaction even under race conditions
appealSchema.index(
  { transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

export const Appeal: Model<IAppeal> =
  mongoose.models.Appeal || mongoose.model<IAppeal>('Appeal', appealSchema);
