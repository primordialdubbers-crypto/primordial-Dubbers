import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPointTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  proposalId?: mongoose.Types.ObjectId | null;
  delta: number;
  balanceBefore: number;
  balanceAfter: number;
  actorId: mongoose.Types.ObjectId;
  reason: string;
  category: string;
  sourceId?: string;
  reversalOf?: mongoose.Types.ObjectId | null;
  idempotencyKey: string;
  createdAt: Date;
}

const pointTransactionSchema = new Schema<IPointTransaction>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: 'PointProposal',
      default: null,
      index: true,
    },
    delta: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    sourceId: {
      type: String,
      default: null,
    },
    reversalOf: {
      type: Schema.Types.ObjectId,
      ref: 'PointTransaction',
      default: null,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    // Point transactions are strictly append-only and immutable. No updatedAt.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

pointTransactionSchema.index({ studentId: 1, createdAt: -1 });

export const PointTransaction: Model<IPointTransaction> =
  mongoose.models.PointTransaction ||
  mongoose.model<IPointTransaction>('PointTransaction', pointTransactionSchema);
