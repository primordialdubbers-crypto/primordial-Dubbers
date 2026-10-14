import { Router, Request, Response } from 'express';
import { ArtistProfile } from '../models/ArtistProfile.js';
import { RankTier } from '@pdi/shared';

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
// Public endpoint: returns artists who have opted-in to public leaderboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const tier = req.query.tier as string | undefined;
    const search = req.query.q as string | undefined;

    const filter: Record<string, any> = { publicOptIn: true };

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
