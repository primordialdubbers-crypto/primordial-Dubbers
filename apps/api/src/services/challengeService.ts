import mongoose from 'mongoose';
import { Challenge, IChallenge } from '../models/index.js';
import { CreateChallengeInput, UpdateChallengeInput } from '@pdi/shared';

export class ChallengeService {
  /**
   * Retrieves active challenges with optional difficulty and target rank filters.
   * If requestingUser is provided and is a student, only public challenges or challenges
   * assigned to that student are returned.
   */
  static async listChallenges(
    query: {
      difficulty?: string;
      targetRank?: string;
      isActive?: boolean | string;
      search?: string;
      page?: number | string;
      limit?: number | string;
    },
    requestingUser?: { id: string; roles: string[] }
  ) {
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

    // Role-based visibility check:
    // If user is a student or unauthenticated, hide other students' personal challenges
    const isStaff = requestingUser?.roles?.some((r) => ['director', 'admin', 'superadmin'].includes(r));
    const userId = requestingUser?.id;

    if (!isStaff) {
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { isPersonal: { $ne: true } },
            { assignedStudentIds: new mongoose.Types.ObjectId(userId) },
          ],
        });
      } else {
        filter.isPersonal = { $ne: true };
      }
    }

    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      const searchCondition = {
        $or: [
          { title: searchRegex },
          { characterName: searchRegex },
          { script: searchRegex },
          { tags: searchRegex },
        ],
      };
      if (filter.$and) {
        filter.$and.push(searchCondition);
      } else {
        Object.assign(filter, searchCondition);
      }
    }

    const [challenges, total] = await Promise.all([
      Challenge.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'displayName email')
        .populate('assignedStudentIds', 'displayName email')
        .lean(),
      Challenge.countDocuments(filter),
    ]);

    return {
      challenges: challenges.map((c) => {
        const assignedStudents = Array.isArray(c.assignedStudentIds)
          ? c.assignedStudentIds.map((s: any) => ({
              id: s._id ? s._id.toString() : s.toString(),
              displayName: s.displayName || 'Student Artist',
              email: s.email || '',
            }))
          : [];

        const assignedIds = Array.isArray(c.assignedStudentIds)
          ? c.assignedStudentIds.map((s: any) => (s._id ? s._id.toString() : s.toString()))
          : [];

        const isAssignedToMe = userId ? assignedIds.includes(userId) : false;

        return {
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
          assignedStudentIds: assignedIds,
          assignedStudents,
          isPersonal: Boolean(c.isPersonal),
          isAssignedToMe,
          createdBy: (c.createdBy as any)?._id?.toString() || c.createdBy.toString(),
          creatorName: (c.createdBy as any)?.displayName || 'Staff Director',
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
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
    return await Challenge.findById(id)
      .populate('createdBy', 'displayName email')
      .populate('assignedStudentIds', 'displayName email');
  }

  /**
   * Creates a new scene challenge / work material (staff/admin).
   */
  static async createChallenge(input: any, createdBy: string): Promise<IChallenge> {
    const assignedStudentIds = Array.isArray(input.assignedStudentIds)
      ? input.assignedStudentIds
          .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
          .map((id: string) => new mongoose.Types.ObjectId(id))
      : [];

    const challenge = new Challenge({
      ...input,
      assignedStudentIds,
      isPersonal: Boolean(input.isPersonal),
      deadline: input.deadline ? new Date(input.deadline) : null,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });

    return await challenge.save();
  }

  /**
   * Updates an existing challenge (staff/admin).
   */
  static async updateChallenge(id: string, input: any): Promise<IChallenge> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_CHALLENGE_ID: Challenge ID is invalid');
    }

    const updateData: any = { ...input };
    if (input.deadline !== undefined) {
      updateData.deadline = input.deadline ? new Date(input.deadline) : null;
    }
    if (input.assignedStudentIds !== undefined) {
      updateData.assignedStudentIds = Array.isArray(input.assignedStudentIds)
        ? input.assignedStudentIds
            .filter((sId: string) => mongoose.Types.ObjectId.isValid(sId))
            .map((sId: string) => new mongoose.Types.ObjectId(sId))
        : [];
    }
    if (input.isPersonal !== undefined) {
      updateData.isPersonal = Boolean(input.isPersonal);
    }

    const updated = await Challenge.findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'displayName email')
      .populate('assignedStudentIds', 'displayName email');

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
