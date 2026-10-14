import { Request, Response, NextFunction } from 'express';
import { updateProfileSchema, calculateRankFromPoints, getRankProgress, calculateArtistMilestones } from '@pdi/shared';
import { ArtistProfile, User, Submission } from '../models/index.js';

export class ArtistController {
  /**
   * GET /api/v1/artists/:userId
   * Public or authenticated artist profile view
   */
  static async getArtistProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const profile = await ArtistProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Artist profile not found',
          error: { code: 'PROFILE_NOT_FOUND' },
        });
      }

      // Enforce privacy: if profile is not public, only owner or staff can view
      if (!profile.publicOptIn) {
        const requester = (req as any).user;
        const isOwner = requester && requester._id.toString() === userId;
        const isStaff =
          requester &&
          requester.roles?.some((r: string) => ['admin', 'superadmin', 'director'].includes(r));

        if (!isOwner && !isStaff) {
          return res.status(404).json({
            success: false,
            message: 'Artist profile is private or not found',
            error: { code: 'PROFILE_PRIVATE' },
          });
        }
      }

      // Check user status
      const user = await User.findById(userId).select('email status createdAt');

      const progress = getRankProgress(profile.rankPoints);
      const auditionsCount = await Submission.countDocuments({ studentId: profile.userId });
      const milestones = calculateArtistMilestones(
        {
          rankPoints: profile.rankPoints,
          currentRank: profile.currentRank,
          performanceAverage: profile.performanceAverage,
        },
        auditionsCount
      );

      res.status(200).json({
        success: true,
        data: {
          profile: {
            userId: profile.userId.toString(),
            displayName: profile.displayName,
            bio: profile.bio,
            voiceTypes: profile.voiceTypes,
            languages: profile.languages || [],
            publicOptIn: profile.publicOptIn,
            rankPoints: profile.rankPoints,
            currentRank: profile.currentRank,
            performanceAverage: profile.performanceAverage,
            rankProgress: progress,
            milestones,
            joinedAt: user?.createdAt || profile.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/me/profile
   * Current user's own artist profile
   */
  static async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      let profile = await ArtistProfile.findOne({ userId });

      if (!profile) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
            error: { code: 'USER_NOT_FOUND' },
          });
        }
        profile = await ArtistProfile.create({
          userId: user._id,
          displayName: user.displayName,
          rankPoints: 0,
          currentRank: 'ED',
          publicOptIn: true,
        });
      }

      const progress = getRankProgress(profile.rankPoints);
      const auditionsCount = await Submission.countDocuments({ studentId: profile.userId });
      const milestones = calculateArtistMilestones(
        {
          rankPoints: profile.rankPoints,
          currentRank: profile.currentRank,
          performanceAverage: profile.performanceAverage,
        },
        auditionsCount
      );

      res.status(200).json({
        success: true,
        data: {
          profile: {
            userId: profile.userId.toString(),
            displayName: profile.displayName,
            bio: profile.bio,
            voiceTypes: profile.voiceTypes,
            languages: profile.languages || [],
            publicOptIn: profile.publicOptIn,
            rankPoints: profile.rankPoints,
            currentRank: profile.currentRank,
            performanceAverage: profile.performanceAverage,
            rankProgress: progress,
            milestones,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/me/profile
   * Update current user's profile details
   */
  static async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const parseResult = updateProfileSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid profile data',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const { displayName, bio, voiceTypes, languages, publicOptIn } = parseResult.data;

      const profile = await ArtistProfile.findOne({ userId });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Artist profile not found',
          error: { code: 'PROFILE_NOT_FOUND' },
        });
      }

      if (displayName !== undefined) {
        profile.displayName = displayName;
        await User.findByIdAndUpdate(userId, { displayName });
      }
      if (bio !== undefined) profile.bio = bio;
      if (voiceTypes !== undefined) profile.voiceTypes = voiceTypes;
      if (languages !== undefined) profile.languages = languages;
      if (publicOptIn !== undefined) profile.publicOptIn = publicOptIn;

      profile.version = (profile.version || 1) + 1;
      await profile.save();

      const progress = getRankProgress(profile.rankPoints);

      res.status(200).json({
        success: true,
        data: {
          profile: {
            userId: profile.userId.toString(),
            displayName: profile.displayName,
            bio: profile.bio,
            voiceTypes: profile.voiceTypes,
            languages: profile.languages || [],
            publicOptIn: profile.publicOptIn,
            rankPoints: profile.rankPoints,
            currentRank: profile.currentRank,
            performanceAverage: profile.performanceAverage,
            rankProgress: progress,
          },
        },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
