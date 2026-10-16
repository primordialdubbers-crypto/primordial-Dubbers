import mongoose, { Document, Model, Schema } from 'mongoose';
import { RankTier, ProfileType } from '@pdi/shared';

export interface IArtistProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  displayName: string;
  bio: string;
  voiceTypes: string[];
  languages: string[];
  publicOptIn: boolean;
  rankPoints: number;
  currentRank: RankTier;
  performanceAverage: number;
  profileType: ProfileType;
  staffDesignation?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const artistProfileSchema = new Schema<IArtistProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    voiceTypes: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    publicOptIn: {
      type: Boolean,
      default: true,
      index: true,
    },
    rankPoints: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    currentRank: {
      type: String,
      enum: ['ED', 'C', 'B', 'A', 'S'],
      default: 'ED',
      index: true,
    },
    performanceAverage: {
      type: Number,
      default: 0,
    },
    profileType: {
      type: String,
      enum: ['student', 'staff'],
      default: 'student',
      index: true,
    },
    staffDesignation: {
      type: String,
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const ArtistProfile: Model<IArtistProfile> =
  mongoose.models.ArtistProfile || mongoose.model<IArtistProfile>('ArtistProfile', artistProfileSchema);
