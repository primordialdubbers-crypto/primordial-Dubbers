import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  calculateRankFromPoints,
  AuthSessionResponse,
  UserSummary,
  ArtistProfileSummary,
} from '@pdi/shared';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { ArtistProfile } from '../models/ArtistProfile.js';
import { signToken, verifyToken } from '../utils/token.js';
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
    const errorMsg = parseResult.error.issues.map((i) => i.message).join('. ');
    res.status(400).json({
      success: false,
      message: errorMsg || 'Invalid registration details.',
      error: { code: 'VALIDATION_ERROR', details: parseResult.error.flatten(), message: errorMsg },
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

  const sessionId = crypto.randomUUID();
  const user = await User.create({
    email,
    displayName,
    passwordHash,
    roles: [assignedRole],
    status: 'active',
    activeSessions: [
      {
        sessionId,
        createdAt: new Date(),
        lastActive: new Date(),
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 255) : undefined,
        ip: req.ip,
      },
    ],
  });

  let artistProfile = null;
  const isStaff = user.roles.some((r) => ['director', 'admin', 'superadmin'].includes(r));
  if (isStaff) {
    artistProfile = await ArtistProfile.create({
      userId: user._id,
      displayName: user.displayName,
      voiceTypes: user.roles.includes('director') ? ['Casting Director'] : ['Administrator'],
      bio: '',
      publicOptIn: false,
      profileType: 'staff',
      staffDesignation: user.roles.includes('admin') || user.roles.includes('superadmin') ? 'Lead Executive Director' : 'Casting Director',
      rankPoints: user.roles.includes('director') ? 2500 : 10000,
      currentRank: user.roles.includes('director') ? 'B' : 'S',
      performanceAverage: 100,
    });
  } else {
    artistProfile = await ArtistProfile.create({
      userId: user._id,
      displayName: user.displayName,
      voiceTypes: [],
      bio: '',
      publicOptIn: true,
      profileType: 'student',
      staffDesignation: null,
      rankPoints: 0,
      currentRank: calculateRankFromPoints(0),
      performanceAverage: 0,
    });
  }

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    roles: user.roles,
    sessionId,
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
        profileType: artistProfile.profileType,
        staffDesignation: artistProfile.staffDesignation || undefined,
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
      const errorMsg = parseResult.error.issues.map((i) => i.message).join('. ');
      res.status(400).json({
        success: false,
        message: errorMsg || 'Invalid login details.',
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.flatten() },
      });
      return;
    }

    const { email: rawIdentifier, password, forceLogoutOthers } = parseResult.data;
    const identifier = rawIdentifier.trim();
    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let user = await User.findOne({
      email: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });

    if (!user && !identifier.includes('@')) {
      user = await User.findOne({
        displayName: { $regex: new RegExp(`^${escaped}$`, 'i') },
      });
    }

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

    // Active session limit enforcement (Max 2 concurrent devices)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const validSessions = (user.activeSessions || []).filter(
      (s) => now - new Date(s.lastActive || s.createdAt).getTime() < SEVEN_DAYS_MS
    );

    if (forceLogoutOthers) {
      user.activeSessions = [];
    } else if (validSessions.length >= 2) {
      res.status(429).json({
        success: false,
        message: 'Active session limit reached (maximum 2 devices). Please log out from another device or choose "Log out other devices" to continue.',
        error: {
          code: 'ACTIVE_SESSION_LIMIT_EXCEEDED',
          activeSessionsCount: validSessions.length,
          maxAllowed: 2,
        },
      });
      return;
    } else {
      user.activeSessions = validSessions;
    }

    const sessionId = crypto.randomUUID();
    user.activeSessions.push({
      sessionId,
      createdAt: new Date(),
      lastActive: new Date(),
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 255) : undefined,
      ip: req.ip,
    });
    await user.save();

    const artistProfile = await ArtistProfile.findOne({ userId: user._id });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      roles: user.roles,
      sessionId,
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
          profileType: artistProfile.profileType,
          staffDesignation: artistProfile.staffDesignation || undefined,
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
  let token = req.cookies?.pdi_token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload.sessionId && payload.userId) {
        await User.updateOne(
          { _id: payload.userId },
          { $pull: { activeSessions: { sessionId: payload.sessionId } } }
        );
      }
    } catch {
      // Ignore token verification errors during logout
    }
  }
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
        profileType: artistProfile.profileType,
        staffDesignation: artistProfile.staffDesignation || undefined,
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

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join('. ');
      res.status(400).json({
        success: false,
        message: errorMsg || 'Invalid reset details.',
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.flatten() },
      });
      return;
    }

    const { email: rawEmail, newPassword } = parseResult.data;
    const email = rawEmail.trim().toLowerCase();
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'No account registered with this email address.',
        error: { code: 'USER_NOT_FOUND' },
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (err) {
    next(err);
  }
}
