import { Request, Response, NextFunction } from 'express';
import { createChallengeSchema, updateChallengeSchema } from '@pdi/shared';
import { ChallengeService } from '../services/challengeService.js';

export class ChallengeController {
  /**
   * GET /api/v1/challenges
   * Public or student listing of challenges with filters
   */
  static async listChallenges(req: Request, res: Response, next: NextFunction) {
    try {
      const { difficulty, targetRank, isActive, search, page, limit } = req.query;
      const result = await ChallengeService.listChallenges({
        difficulty: difficulty as string,
        targetRank: targetRank as string,
        isActive: isActive !== undefined ? (isActive as string) : 'true',
        search: search as string,
        page: page as string,
        limit: limit as string,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/challenges/:id
   * Detail view of a challenge
   */
  static async getChallengeById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const challenge = await ChallengeService.getChallengeById(id);

      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Audition challenge not found',
          error: { code: 'CHALLENGE_NOT_FOUND' },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          challenge: {
            id: challenge._id.toString(),
            title: challenge.title,
            description: challenge.description,
            characterName: challenge.characterName,
            script: challenge.script,
            difficulty: challenge.difficulty,
            targetRank: challenge.targetRank,
            referenceMediaUrl: challenge.referenceMediaUrl,
            deadline: challenge.deadline ? challenge.deadline.toISOString() : null,
            isActive: challenge.isActive,
            tags: challenge.tags,
            createdAt: challenge.createdAt.toISOString(),
            updatedAt: challenge.updatedAt.toISOString(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/challenges
   * Admin or Director creates a new challenge
   */
  static async createChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = (req as any).user?.id;
      const parseResult = createChallengeSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid challenge payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const challenge = await ChallengeService.createChallenge(parseResult.data, createdBy);

      res.status(201).json({
        success: true,
        data: {
          challenge: {
            id: challenge._id.toString(),
            title: challenge.title,
            description: challenge.description,
            characterName: challenge.characterName,
            script: challenge.script,
            difficulty: challenge.difficulty,
            targetRank: challenge.targetRank,
            referenceMediaUrl: challenge.referenceMediaUrl,
            deadline: challenge.deadline ? challenge.deadline.toISOString() : null,
            isActive: challenge.isActive,
            tags: challenge.tags,
            createdAt: challenge.createdAt.toISOString(),
          },
        },
        message: 'Audition challenge created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/challenges/:id
   * Admin or Director updates a challenge
   */
  static async updateChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parseResult = updateChallengeSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid challenge update payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const updated = await ChallengeService.updateChallenge(id, parseResult.data);

      res.status(200).json({
        success: true,
        data: {
          challenge: {
            id: updated._id.toString(),
            title: updated.title,
            description: updated.description,
            characterName: updated.characterName,
            script: updated.script,
            difficulty: updated.difficulty,
            targetRank: updated.targetRank,
            referenceMediaUrl: updated.referenceMediaUrl,
            deadline: updated.deadline ? updated.deadline.toISOString() : null,
            isActive: updated.isActive,
            tags: updated.tags,
            updatedAt: updated.updatedAt.toISOString(),
          },
        },
        message: 'Audition challenge updated successfully',
      });
    } catch (error: any) {
      if (error?.message?.includes('CHALLENGE_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'CHALLENGE_NOT_FOUND' },
        });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/challenges/:id
   */
  static async deleteChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ChallengeService.deleteChallenge(id);

      res.status(200).json({
        success: true,
        message: 'Challenge deleted successfully',
      });
    } catch (error: any) {
      if (error?.message?.includes('CHALLENGE_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'CHALLENGE_NOT_FOUND' },
        });
      }
      next(error);
    }
  }
}
