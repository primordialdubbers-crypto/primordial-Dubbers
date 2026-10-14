import mongoose, { Document, Model, Schema } from 'mongoose';
import { SubmissionStatus, SubmissionType } from '@pdi/shared';

export interface ISubmission extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  audioUrl: string;
  durationSeconds: number;
  mimeType: string;
  submissionType: SubmissionType;
  syncOffsetMs: number;
  status: SubmissionStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true,
    },
    audioUrl: {
      type: String,
      required: true,
      trim: true,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 0.1,
      max: 600,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    submissionType: {
      type: String,
      enum: ['recorded', 'uploaded'],
      default: 'uploaded',
    },
    syncOffsetMs: {
      type: Number,
      default: 0,
      min: -500,
      max: 500,
    },
    status: {
      type: String,
      enum: ['submitted', 'reviewed', 'approved', 'rejected'],
      default: 'submitted',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ studentId: 1, createdAt: -1 });
submissionSchema.index({ challengeId: 1, createdAt: -1 });

export const Submission: Model<ISubmission> =
  mongoose.models.Submission || mongoose.model<ISubmission>('Submission', submissionSchema);
