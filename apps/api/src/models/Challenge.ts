import mongoose, { Document, Model, Schema } from 'mongoose';
import { ChallengeDifficulty, RankTier } from '@pdi/shared';

export interface IChallenge extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  characterName: string;
  script: string;
  difficulty: ChallengeDifficulty;
  targetRank: RankTier;
  referenceMediaUrl?: string;
  deadline?: Date | null;
  isActive: boolean;
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const challengeSchema = new Schema<IChallenge>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    characterName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    script: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Master'],
      default: 'Beginner',
      index: true,
    },
    targetRank: {
      type: String,
      enum: ['ED', 'C', 'B', 'A', 'S'],
      default: 'ED',
      index: true,
    },
    referenceMediaUrl: {
      type: String,
      default: '',
      trim: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

challengeSchema.index({ isActive: 1, difficulty: 1, targetRank: 1 });
challengeSchema.index({ createdAt: -1 });

export const Challenge: Model<IChallenge> =
  mongoose.models.Challenge || mongoose.model<IChallenge>('Challenge', challengeSchema);
