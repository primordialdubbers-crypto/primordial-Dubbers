import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  User,
  ArtistProfile,
  Notification,
  Challenge,
  Submission,
  Evaluation,
  PointTransaction,
  PointProposal,
  RankEvent,
  Appeal,
} from '../models/index.js';
import { config } from '../config/env.js';

export class AdminUserController {
  /**
   * GET /api/v1/admin/users
   * Lists and searches registered users with rank, points, and role filtering.
   */
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

      const filter: any = {};

      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        filter.$or = [{ displayName: regex }, { email: regex }];
      }

      if (role && role !== 'all') {
        filter.roles = role;
      }

      if (status && status !== 'all') {
        filter.status = status;
      }

      const total = await User.countDocuments(filter);
      const users = await User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const userIds = users.map((u) => u._id);
      const profiles = await ArtistProfile.find({ userId: { $in: userIds } })
        .select('userId currentRank rankPoints')
        .lean();

      const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

      const formatted = users.map((u) => {
        const p = profileMap.get(u._id.toString());
        return {
          id: u._id.toString(),
          email: u.email,
          displayName: u.displayName,
          roles: u.roles,
          status: u.status,
          currentRank: p?.currentRank || 'ED',
          rankPoints: p?.rankPoints ?? 0,
          createdAt: u.createdAt,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          users: formatted,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/admin/users/:userId
   * Authoritatively deletes a user and cascades cleanup across artist profiles,
   * submissions, notifications, and assignment lists.
   */
  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const requester = (req as any).user;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID provided',
          error: { code: 'INVALID_USER_ID' },
        });
      }

      // Guard: Admin cannot delete their own active account
      if (requester && requester._id.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own active administrator account',
          error: { code: 'CANNOT_DELETE_SELF' },
        });
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found in system',
          error: { code: 'USER_NOT_FOUND' },
        });
      }

      // Guard: Protected system root admin accounts
      const protectedEmails = [
        'admin@pdi.academy',
        'primordialdubbers@gmail.com',
        (config.adminDefaultEmail || '').toLowerCase().trim(),
      ].filter(Boolean);

      if (protectedEmails.includes(targetUser.email.toLowerCase().trim())) {
        return res.status(403).json({
          success: false,
          message: 'System root administrator account is protected and cannot be deleted',
          error: { code: 'PROTECTED_USER_CANNOT_BE_DELETED' },
        });
      }

      // 1. Delete matching ArtistProfile
      await ArtistProfile.deleteMany({ userId: targetUser._id });

      // 2. Delete Notifications for this user
      await Notification.deleteMany({ recipientId: targetUser._id });

      // 3. Remove user from assigned student lists in challenges
      await Challenge.updateMany(
        { assignedStudentIds: targetUser._id },
        { $pull: { assignedStudentIds: targetUser._id } }
      );

      // 4. Delete user submissions and associated rubric evaluations
      const userSubmissions = await Submission.find({ studentId: targetUser._id }).select('_id');
      const submissionIds = userSubmissions.map((s) => s._id);
      if (submissionIds.length > 0) {
        await Evaluation.deleteMany({ submissionId: { $in: submissionIds } });
        await Submission.deleteMany({ studentId: targetUser._id });
      }

      // 5. Delete Points records and appeals
      await PointTransaction.deleteMany({ studentId: targetUser._id });
      await PointProposal.deleteMany({ studentId: targetUser._id });
      await RankEvent.deleteMany({ studentId: targetUser._id });
      await Appeal.deleteMany({ studentId: targetUser._id });

      // 6. Delete user credential document
      await User.findByIdAndDelete(targetUser._id);

      res.status(200).json({
        success: true,
        message: `User "${targetUser.displayName}" (${targetUser.email}) and all associated records have been permanently removed.`,
        data: {
          deletedUserId: targetUser._id.toString(),
          email: targetUser.email,
          displayName: targetUser.displayName,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:userId/status
   * Suspends or reactivates a user account.
   */
  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const requester = (req as any).user;

      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either "active" or "suspended"',
          error: { code: 'INVALID_STATUS' },
        });
      }

      if (requester && requester._id.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify status of your own administrator account',
          error: { code: 'CANNOT_MODIFY_SELF' },
        });
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: { code: 'USER_NOT_FOUND' },
        });
      }

      targetUser.status = status;
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: `User "${targetUser.displayName}" status updated to ${status}.`,
        data: {
          userId: targetUser._id.toString(),
          status: targetUser.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
