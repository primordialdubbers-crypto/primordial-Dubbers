import mongoose from 'mongoose';
import { Challenge, IChallenge } from '../models/index.js';
import { CreateChallengeInput, UpdateChallengeInput } from '@pdi/shared';

export class ChallengeService {
  /**
   * Retrieves active challenges with optional difficulty and target rank filters.
   */
  static async listChallenges(query: {
    difficulty?: string;
    targetRank?: string;
    isActive?: boolean | string;
    search?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const pageNum = Math.max(1, parseInt(query.page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    if (query.isActive !== undefined && query.isActive !== '') {
      filter.isActive = String(query.isActive) === 'true';
    }

    if (query.difficulty && query.difficulty !== 'all') {
      filter.difficulty = query.difficulty;
    }

    if (query.targetRank && query.targetRank !== 'all') {
      filter.targetRank = query.targetRank;
    }

    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$or = [
        { title: searchRegex },
        { characterName: searchRegex },
        { script: searchRegex },
        { tags: searchRegex },
      ];
    }

    const [challenges, total] = await Promise.all([
      Challenge.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'displayName email')
        .lean(),
      Challenge.countDocuments(filter),
    ]);

    return {
      challenges: challenges.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        description: c.description,
        characterName: c.characterName,
        script: c.script,
        difficulty: c.difficulty,
        targetRank: c.targetRank,
        referenceMediaUrl: c.referenceMediaUrl,
        deadline: c.deadline ? c.deadline.toISOString() : null,
        isActive: c.isActive,
        tags: c.tags,
        createdBy: (c.createdBy as any)?._id?.toString() || c.createdBy.toString(),
        creatorName: (c.createdBy as any)?.displayName || 'Staff Director',
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Retrieves single challenge by ID.
   */
  static async getChallengeById(id: string): Promise<IChallenge | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Challenge.findById(id).populate('createdBy', 'displayName email');
  }

  /**
   * Creates a new scene challenge (staff/admin).
   */
  static async createChallenge(input: CreateChallengeInput, createdBy: string): Promise<IChallenge> {
    const challenge = new Challenge({
      ...input,
      deadline: input.deadline ? new Date(input.deadline) : null,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });

    return await challenge.save();
  }

  /**
   * Updates an existing challenge (staff/admin).
   */
  static async updateChallenge(id: string, input: UpdateChallengeInput): Promise<IChallenge> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_CHALLENGE_ID: Challenge ID is invalid');
    }

    const updateData: any = { ...input };
    if (input.deadline !== undefined) {
      updateData.deadline = input.deadline ? new Date(input.deadline) : null;
    }

    const updated = await Challenge.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      throw new Error('CHALLENGE_NOT_FOUND: Challenge does not exist');
    }

    return updated;
  }

  /**
   * Deactivates or removes a challenge.
   */
  static async deleteChallenge(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_CHALLENGE_ID: Challenge ID is invalid');
    }
    const res = await Challenge.findByIdAndDelete(id);
    if (!res) {
      throw new Error('CHALLENGE_NOT_FOUND: Challenge does not exist');
    }
  }
}
