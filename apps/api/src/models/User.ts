import mongoose, { Document, Model, Schema } from 'mongoose';
import { Role, UserStatus } from '@pdi/shared';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  displayName: string;
  passwordHash: string;
  roles: Role[];
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      enum: ['student', 'director', 'admin', 'superadmin'],
      default: ['student'],
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_verification'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
