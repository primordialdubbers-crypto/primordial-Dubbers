import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import {
  registerSchema,
  loginSchema,
  calculateRankFromPoints,
  AuthSessionResponse,
  UserSummary,
  ArtistProfileSummary,
} from '@pdi/shared';
import { User } from '../models/User.js';
import { ArtistProfile } from '../models/ArtistProfile.js';
import { signToken } from '../utils/token.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { config } from '../config/env.js';

const COOKIE_NAME = 'pdi_token';

function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'strict' : 'lax',
    path: '/',
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid registration details.',
      error: { code: 'VALIDATION_ERROR', details: parseResult.error.flatten() },
    });
    return;
  }

  const { email, password, displayName, requestedRole, adminInviteToken } = parseResult.data;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
      error: { code: 'EMAIL_ALREADY_EXISTS' },
    });
    return;
  }

  // Security enforcement: Public registration defaults strictly to 'student'.
  // Elevated roles ('admin' or 'director') require a valid administrative invite token.
  let assignedRole = 'student';
  if (requestedRole && requestedRole !== 'student') {
    if (!adminInviteToken || adminInviteToken !== config.adminInviteToken) {
      res.status(403).json({
        success: false,
        message:
          'Public registration only permits student accounts. Administrative or Casting Director provisioning requires a valid administrative invite token.',
        error: { code: 'ROLE_PROVISIONING_FORBIDDEN' },
      });
      return;
    }
    assignedRole = requestedRole;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    email,
    displayName,
    passwordHash,
    roles: [assignedRole],
    status: 'active',
  });

  let artistProfile = null;
  // Create an artist profile for any user with student role (or by default)
  if (user.roles.includes('student')) {
    artistProfile = await ArtistProfile.create({
      userId: user._id,
      displayName: user.displayName,
      voiceTypes: [],
      bio: '',
      publicOptIn: true,
      rankPoints: 0,
      currentRank: calculateRankFromPoints(0),
      performanceAverage: 0,
    });
  }

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    roles: user.roles,
  });

  setAuthCookie(res, token);

  const userSummary: UserSummary = {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };

  const profileSummary: ArtistProfileSummary | undefined = artistProfile
    ? {
        userId: artistProfile.userId.toString(),
        displayName: artistProfile.displayName,
        bio: artistProfile.bio,
        voiceTypes: artistProfile.voiceTypes,
        publicOptIn: artistProfile.publicOptIn,
        rankPoints: artistProfile.rankPoints,
        currentRank: artistProfile.currentRank,
        performanceAverage: artistProfile.performanceAverage,
      }
    : undefined;

  const responseData: AuthSessionResponse = {
    user: userSummary,
    profile: profileSummary,
    token,
  };

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: responseData,
  });
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid login details.',
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.flatten() },
      });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        error: { code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        error: { code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact an administrator.`,
        error: { code: 'ACCOUNT_INACTIVE' },
      });
      return;
    }

    const artistProfile = await ArtistProfile.findOne({ userId: user._id });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      roles: user.roles,
    });

    setAuthCookie(res, token);

    const userSummary: UserSummary = {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };

    const profileSummary: ArtistProfileSummary | undefined = artistProfile
      ? {
          userId: artistProfile.userId.toString(),
          displayName: artistProfile.displayName,
          bio: artistProfile.bio,
          voiceTypes: artistProfile.voiceTypes,
          publicOptIn: artistProfile.publicOptIn,
          rankPoints: artistProfile.rankPoints,
          currentRank: artistProfile.currentRank,
          performanceAverage: artistProfile.performanceAverage,
        }
      : undefined;

    const responseData: AuthSessionResponse = {
      user: userSummary,
      profile: profileSummary,
      token,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logout successful.',
  });
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
      error: { code: 'UNAUTHORIZED' },
    });
    return;
  }

  const artistProfile = await ArtistProfile.findOne({ userId: user._id });

  const userSummary: UserSummary = {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };

  const profileSummary: ArtistProfileSummary | undefined = artistProfile
    ? {
        userId: artistProfile.userId.toString(),
        displayName: artistProfile.displayName,
        bio: artistProfile.bio,
        voiceTypes: artistProfile.voiceTypes,
        publicOptIn: artistProfile.publicOptIn,
        rankPoints: artistProfile.rankPoints,
        currentRank: artistProfile.currentRank,
        performanceAverage: artistProfile.performanceAverage,
      }
    : undefined;

  res.status(200).json({
    success: true,
    data: {
      user: userSummary,
      profile: profileSummary,
    },
  });
}
