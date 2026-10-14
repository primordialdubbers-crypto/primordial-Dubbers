import { Request, Response, NextFunction } from 'express';
import { TalentListResponse, TalentRecord, RankTier } from '@pdi/shared';
import { ArtistProfile, User, Submission } from '../models/index.js';

export class TalentController {
  /**
   * GET /api/v1/director/talents
   * Queries opted-in talents with multi-criteria filtering for casting directors.
   */
  static async getTalents(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        rank,
        voiceType,
        language,
        minPoints,
        search,
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const filter: any = {
        publicOptIn: true,
      };

      if (rank && ['ED', 'C', 'B', 'A', 'S'].includes(rank as string)) {
        filter.currentRank = rank as RankTier;
      }

      if (voiceType && typeof voiceType === 'string' && voiceType.trim()) {
        filter.voiceTypes = { $regex: new RegExp(escapeRegex(voiceType.trim()), 'i') };
      }

      if (language && typeof language === 'string' && language.trim()) {
        filter.languages = { $regex: new RegExp(escapeRegex(language.trim()), 'i') };
      }

      if (minPoints !== undefined && !isNaN(Number(minPoints))) {
        filter.rankPoints = { $gte: Number(minPoints) };
      }

      if (search && typeof search === 'string' && search.trim()) {
        const regex = new RegExp(escapeRegex(search.trim()), 'i');
        filter.$or = [{ displayName: regex }, { bio: regex }];
      }

      const [profiles, total] = await Promise.all([
        ArtistProfile.find(filter)
          .sort({ rankPoints: -1, performanceAverage: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        ArtistProfile.countDocuments(filter),
      ]);

      const userIds = profiles.map((p) => p.userId);

      // Fetch user details (emails)
      const users = await User.find({ _id: { $in: userIds } }).select('email').lean();
      const userMap = new Map(users.map((u) => [u._id.toString(), u.email]));

      // Fetch latest submission and counts per user
      const talents: TalentRecord[] = await Promise.all(
        profiles.map(async (p) => {
          const uid = p.userId.toString();
          const [latestSub, totalSubs, approvedSubs] = await Promise.all([
            Submission.findOne({ studentId: p.userId })
              .sort({ createdAt: -1 })
              .select('audioUrl')
              .lean(),
            Submission.countDocuments({ studentId: p.userId }),
            Submission.countDocuments({ studentId: p.userId, status: { $in: ['reviewed', 'approved'] } }),
          ]);

          return {
            userId: uid,
            displayName: p.displayName,
            email: userMap.get(uid) || '',
            bio: p.bio || '',
            voiceTypes: p.voiceTypes || [],
            languages: (p as any).languages || [],
            currentRank: p.currentRank,
            rankPoints: p.rankPoints,
            performanceAverage: p.performanceAverage || 0,
            publicOptIn: p.publicOptIn,
            sampleAudioUrl: latestSub?.audioUrl || undefined,
            totalSubmissions: totalSubs,
            approvedSubmissions: approvedSubs,
            createdAt: p.createdAt ? p.createdAt.toISOString() : undefined,
          };
        })
      );

      const response: TalentListResponse = {
        talents,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
