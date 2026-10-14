import mongoose, { Document, Model, Schema } from 'mongoose';
import { PointProposalStatus, PointSourceType } from '@pdi/shared';

export interface IPointProposal extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  reviewId?: mongoose.Types.ObjectId | null;
  sourceType: PointSourceType;
  sourceId?: string;
  delta: number;
  category: string;
  reason: string;
  evidenceIds: string[];
  status: PointProposalStatus;
  requestedBy: mongoose.Types.ObjectId;
  decidedBy?: mongoose.Types.ObjectId | null;
  decidedAt?: Date | null;
  decisionNote?: string;
  policyVersion: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const pointProposalSchema = new Schema<IPointProposal>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
    },
    sourceType: {
      type: String,
      enum: ['review', 'manual_award', 'manual_deduction', 'challenge', 'appeal_reversal'],
      default: 'manual_award',
      required: true,
    },
    sourceId: {
      type: String,
      default: null,
    },
    delta: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    evidenceIds: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    policyVersion: {
      type: String,
      default: '1.0',
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

pointProposalSchema.index({ status: 1, createdAt: -1 });
pointProposalSchema.index({ studentId: 1, createdAt: -1 });

export const PointProposal: Model<IPointProposal> =
  mongoose.models.PointProposal ||
  mongoose.model<IPointProposal>('PointProposal', pointProposalSchema);
