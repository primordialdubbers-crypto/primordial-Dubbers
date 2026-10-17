import { Router, Response } from 'express';
import { ArtistProfile } from '../models/ArtistProfile.js';
import { User } from '../models/User.js';
import { Evaluation } from '../models/Evaluation.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { RankTier, calculateStaffRankFromPoints, StaffLeaderboardEntry } from '@pdi/shared';

const router = Router();

export interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  currentRank: RankTier;
  rankPoints: number;
  voiceTypes: string[];
  performanceAverage: number;
  bio: string;
}

// GET /api/v1/leaderboard
// Supports:
// 1. type=student (default): Public student voice artists (excludes staff)
// 2. type=staff: Role-gated to Admin and Casting Directors (returns staff tiers & designations)
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const type = (req.query.type as string | undefined)?.toLowerCase();
    const tier = req.query.tier as string | undefined;
    const search = req.query.q as string | undefined;

    // --- STAFF LEADERBOARD BRANCH ---
    if (type === 'staff') {
      // Role-gated: visible only to Admins and Casting Directors
      const userRoles = req.user?.roles || [];
      const hasStaffAccess =
        userRoles.includes('admin') ||
        userRoles.includes('superadmin') ||
        userRoles.includes('director');

      if (!hasStaffAccess) {
        res.status(403).json({
          success: false,
          message: 'Staff ranking is restricted to Academy Administration and Casting Directors.',
          error: { code: 'STAFF_RANKING_FORBIDDEN' },
        });
        return;
      }

      // Query active staff users (admin, superadmin, director)
      const staffUserFilter: Record<string, any> = {
        roles: { $in: ['admin', 'director', 'superadmin'] },
        status: 'active',
      };

      if (search && search.trim().length > 0) {
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        staffUserFilter.$or = [
          { displayName: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
        ];
      }

      const staffUsers = await User.find(staffUserFilter).lean();
      const staffUserIds = staffUsers.map((u) => u._id);

      // Find staff profiles
      const staffProfiles = await ArtistProfile.find({
        userId: { $in: staffUserIds },
      }).lean();

      const profileMap = new Map(staffProfiles.map((p) => [p.userId.toString(), p]));

      // Gather review counts for staff
      const reviewCounts = await Evaluation.aggregate([
        { $match: { directorId: { $in: staffUserIds } } },
        { $group: { _id: '$directorId', count: { $sum: 1 } } },
      ]);
      const reviewCountMap = new Map(reviewCounts.map((r) => [r._id.toString(), r.count]));

      // Format staff entries
      const staffData: StaffLeaderboardEntry[] = staffUsers.map((user) => {
        const profile = profileMap.get(user._id.toString());
        const points = profile?.rankPoints ?? (user.roles.includes('admin') || user.roles.includes('superadmin') ? 10000 : 2500);
        const staffRankInfo = calculateStaffRankFromPoints(points);
        const reviews = reviewCountMap.get(user._id.toString()) || 0;

        return {
          id: profile?._id?.toString() || user._id.toString(),
          userId: user._id.toString(),
          displayName: user.displayName,
          email: user.email,
          currentRank: staffRankInfo.tier,
          staffDesignation: profile?.staffDesignation || staffRankInfo.designation,
          rankPoints: points,
          roles: user.roles,
          reviewsConducted: reviews,
          bio: profile?.bio || '',
          createdAt: user.createdAt?.toISOString(),
        };
      });

      // Filter by tier if specified
      let filteredStaff = staffData;
      if (tier && ['ED', 'C', 'B', 'A', 'S'].includes(tier.toUpperCase())) {
        filteredStaff = staffData.filter((s) => s.currentRank === tier.toUpperCase());
      }

      // Sort by points descending, then by reviews conducted
      filteredStaff.sort((a, b) => {
        if (b.rankPoints !== a.rankPoints) return b.rankPoints - a.rankPoints;
        return (b.reviewsConducted || 0) - (a.reviewsConducted || 0);
      });

      res.status(200).json({
        success: true,
        data: {
          leaderboard: filteredStaff,
          totalCount: filteredStaff.length,
          type: 'staff',
        },
      });
      return;
    }

    // Find all active student users
    const activeStudentUsers = await User.find({
      status: 'active',
      roles: { $nin: ['admin', 'superadmin', 'director'] },
    }).select('_id').lean();
    const activeStudentUserIds = activeStudentUsers.map((u) => u._id);

    // Strictly excludes staff profiles and users who are deleted or suspended
    const filter: Record<string, any> = {
      userId: { $in: activeStudentUserIds },
      publicOptIn: true,
      profileType: { $ne: 'staff' },
    };

    if (tier && ['ED', 'C', 'B', 'A', 'S'].includes(tier.toUpperCase())) {
      filter.currentRank = tier.toUpperCase();
    }

    if (search && search.trim().length > 0) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.displayName = { $regex: escaped, $options: 'i' };
    }

    const profiles = await ArtistProfile.find(filter)
      .sort({ rankPoints: -1, createdAt: 1 })
      .limit(100)
      .lean();

    const data: LeaderboardEntry[] = profiles.map((p) => ({
      id: p._id.toString(),
      userId: p.userId.toString(),
      displayName: p.displayName,
      currentRank: p.currentRank,
      rankPoints: p.rankPoints,
      voiceTypes: p.voiceTypes || [],
      performanceAverage: p.performanceAverage || 0,
      bio: p.bio || '',
    }));

    res.status(200).json({
      success: true,
      data: {
        leaderboard: data,
        totalCount: data.length,
        type: 'student',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaderboard.',
      error: { code: 'LEADERBOARD_ERROR', details: error.message },
    });
  }
});

export default router;
