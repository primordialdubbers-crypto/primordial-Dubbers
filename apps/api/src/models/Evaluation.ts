import mongoose, { Document, Model, Schema } from 'mongoose';
import { EvaluationStatus, RubricScores, TimestampComment } from '@pdi/shared';

export interface IEvaluation extends Document {
  _id: mongoose.Types.ObjectId;
  submissionId: mongoose.Types.ObjectId;
  directorId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  scores: RubricScores;
  totalScore: number;
  grade: string;
  timestampComments: TimestampComment[];
  summaryNotes?: string;
  strengths?: string;
  areasForImprovement?: string;
  status: EvaluationStatus;
  pointProposalId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const evaluationSchema = new Schema<IEvaluation>(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true,
      index: true,
    },
    directorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    scores: {
      acting: { type: Number, required: true, min: 0, max: 25 },
      timing: { type: Number, required: true, min: 0, max: 20 },
      pronunciation: { type: Number, required: true, min: 0, max: 20 },
      expression: { type: Number, required: true, min: 0, max: 20 },
      audio: { type: Number, required: true, min: 0, max: 15 },
    },
    totalScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      default: '',
      trim: true,
    },
    timestampComments: [
      {
        timestampSeconds: { type: Number, required: true, min: 0 },
        comment: { type: String, required: true, trim: true, maxlength: 500 },
      },
    ],
    summaryNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    strengths: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    areasForImprovement: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted'],
      default: 'submitted',
      index: true,
    },
    pointProposalId: {
      type: Schema.Types.ObjectId,
      ref: 'PointProposal',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

evaluationSchema.index({ studentId: 1, createdAt: -1 });
evaluationSchema.index({ directorId: 1, createdAt: -1 });

export const Evaluation: Model<IEvaluation> =
  mongoose.models.Evaluation || mongoose.model<IEvaluation>('Evaluation', evaluationSchema);
