import { Request, Response, NextFunction } from 'express';
import { createEvaluationSchema } from '@pdi/shared';
import { EvaluationService } from '../services/evaluationService.js';

export class EvaluationController {
  /**
   * POST /api/v1/evaluations
   * Casting director scores a submission via the 100-point rubric
   */
  static async createOrUpdateEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const directorId = (req as any).user?.id;
      const parseResult = createEvaluationSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid evaluation payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const evaluation = await EvaluationService.upsertEvaluation(parseResult.data, directorId);

      res.status(200).json({
        success: true,
        data: { evaluation },
        message:
          parseResult.data.status === 'draft'
            ? 'Evaluation draft saved successfully'
            : 'Audition evaluation submitted successfully',
      });
    } catch (error: any) {
      if (
        error?.message?.includes('INVALID_SUBMISSION_ID') ||
        error?.message?.includes('SELF_PROPOSAL_FORBIDDEN') ||
        error?.message?.includes('SELF_EVALUATION_FORBIDDEN') ||
        error?.message?.includes('FINALIZED_EVALUATION_LOCKED')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: { code: 'EVALUATION_ERROR' },
        });
      }
      if (error?.message?.includes('SUBMISSION_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'SUBMISSION_NOT_FOUND' },
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/evaluations/submission/:submissionId
   * Retrieves the evaluation for a submission
   */
  static async getEvaluationBySubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const { submissionId } = req.params;
      const requestingUser = (req as any).user;

      const evaluation = await EvaluationService.getEvaluationForSubmission(submissionId, requestingUser);

      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'No evaluation found for this submission',
          error: { code: 'EVALUATION_NOT_FOUND' },
        });
      }

      res.status(200).json({
        success: true,
        data: { evaluation },
      });
    } catch (error: any) {
      if (error?.message?.includes('FORBIDDEN')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          error: { code: 'FORBIDDEN' },
        });
      }
      if (error?.message?.includes('INVALID_SUBMISSION_ID')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: { code: 'INVALID_ID' },
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/director/review-queue
   * Director review queue of submissions
   */
  static async getReviewQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const queue = await EvaluationService.getDirectorReviewQueue();

      res.status(200).json({
        success: true,
        data: { queue },
      });
    } catch (error) {
      next(error);
    }
  }
}
