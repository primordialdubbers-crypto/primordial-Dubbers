import { Request, Response, NextFunction } from 'express';
import { Role } from '@pdi/shared';
import { verifyToken, JwtPayload } from '../utils/token.js';
import { User, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  jwtPayload?: JwtPayload;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.pdi_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No session or token provided.',
        error: { code: 'UNAUTHORIZED' },
      });
      return;
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Account associated with this session no longer exists.',
        error: { code: 'USER_NOT_FOUND' },
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Access denied.`,
        error: { code: 'ACCOUNT_INACTIVE' },
      });
      return;
    }

    if (payload.sessionId && Array.isArray(user.activeSessions) && user.activeSessions.length > 0) {
      const activeSession = user.activeSessions.find((s) => s.sessionId === payload.sessionId);
      if (!activeSession) {
        res.status(401).json({
          success: false,
          message: 'Your session has been terminated or logged out from this device.',
          error: { code: 'SESSION_TERMINATED' },
        });
        return;
      }
      // Update lastActive timestamp if older than 5 minutes to avoid frequent writes
      const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
      if (new Date(activeSession.lastActive).getTime() < fiveMinsAgo) {
        User.updateOne(
          { _id: user._id, 'activeSessions.sessionId': payload.sessionId },
          { $set: { 'activeSessions.$.lastActive': new Date() } }
        ).catch(() => {});
      }
    }

    req.user = user;
    req.jwtPayload = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
      error: { code: 'INVALID_TOKEN' },
    });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        error: { code: 'UNAUTHORIZED' },
      });
      return;
    }

    const userRoles = req.user.roles || [];
    // superadmin has access to everything
    const hasPermission =
      userRoles.includes('superadmin') ||
      allowedRoles.some((role) => userRoles.includes(role));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `Forbidden: requires one of [${allowedRoles.join(', ')}] permissions.`,
        error: { code: 'FORBIDDEN' },
      });
      return;
    }

    next();
  };
}

export const requireAuth = authenticate;

export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.pdi_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);

    if (user && user.status === 'active') {
      req.user = user;
      req.jwtPayload = payload;
    }

    next();
  } catch {
    // If token is invalid or expired, continue as guest
    next();
  }
}


