import { Request, Response, NextFunction } from 'express';
import { createAppealSchema, resolveAppealSchema } from '@pdi/shared';
import { AppealService } from '../services/appealService.js';

export class AppealController {
  /**
   * POST /api/v1/me/appeals
   * Student submits an appeal against an approved negative point transaction (deduction)
   */
  static async submitAppeal(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = (req as any).user?.id;
      const parseResult = createAppealSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid appeal payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const appeal = await AppealService.createAppeal({
        studentId,
        transactionId: parseResult.data.transactionId,
        reason: parseResult.data.reason,
        evidenceText: parseResult.data.evidenceText,
      });

      res.status(201).json({
        success: true,
        data: {
          appeal: {
            id: appeal._id.toString(),
            studentId: appeal.studentId.toString(),
            transactionId: appeal.transactionId.toString(),
            reason: appeal.reason,
            evidenceText: appeal.evidenceText,
            status: appeal.status,
            createdAt: appeal.createdAt,
          },
        },
        message: 'Appeal submitted for administrative review',
      });
    } catch (error: any) {
      if (
        error?.message?.includes('INVALID_TRANSACTION_ID') ||
        error?.message?.includes('INVALID_APPEAL_TARGET')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: { code: 'INVALID_APPEAL' },
        });
      }
      if (error?.message?.includes('FORBIDDEN_TRANSACTION')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          error: { code: 'FORBIDDEN_TRANSACTION' },
        });
      }
      if (error?.message?.includes('TRANSACTION_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'TRANSACTION_NOT_FOUND' },
        });
      }
      if (
        error?.message?.includes('APPEAL_ALREADY_PENDING') ||
        error?.message?.includes('APPEAL_ALREADY_GRANTED')
      ) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error: { code: 'CONFLICT' },
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/me/appeals
   * Student views their submitted appeals
   */
  static async getMyAppeals(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = (req as any).user?.id;
      const appeals = await AppealService.getStudentAppeals(studentId);

      res.status(200).json({
        success: true,
        data: { appeals },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/appeals
   * Admin lists all submitted appeals with status filtering & pagination
   */
  static async getAdminAppeals(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page, limit } = req.query;
      const result = await AppealService.getAdminAppeals({
        status: status as string,
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
   * POST /api/v1/admin/appeals/:id/resolve
   * Admin resolves an appeal (grant or reject).
   * Granting creates an additive inverse transaction in pointTransactions.
   */
  static async resolveAppeal(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.id;
      const { id } = req.params;
      const parseResult = resolveAppealSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid appeal resolution payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const result = await AppealService.resolveAppeal({
        appealId: id,
        actorId,
        decision: parseResult.data.decision,
        decisionNote: parseResult.data.decisionNote,
      });

      res.status(200).json({
        success: true,
        data: {
          appeal: {
            id: result.appeal._id.toString(),
            status: result.appeal.status,
            decidedBy: result.appeal.decidedBy?.toString(),
            decidedAt: result.appeal.decidedAt,
            decisionNote: result.appeal.decisionNote,
            reversalTransactionId: result.appeal.reversalTransactionId?.toString() || null,
          },
          reversed: result.reversed,
          transaction: result.mutationResult ? {
            id: result.mutationResult.transaction._id.toString(),
            delta: result.mutationResult.transaction.delta,
            balanceBefore: result.mutationResult.balanceBefore,
            balanceAfter: result.mutationResult.balanceAfter,
            newRank: result.mutationResult.newRank,
            rankChanged: result.mutationResult.rankChanged,
          } : null,
        },
        message: result.reversed
          ? `Appeal granted! Additive inverse reversal applied (+${result.mutationResult?.transaction.delta} pts).`
          : 'Appeal rejected.',
      });
    } catch (error: any) {
      if (error?.message?.includes('APPEAL_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'APPEAL_NOT_FOUND' },
        });
      }
      if (error?.message?.includes('SELF_RESOLUTION_FORBIDDEN')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          error: { code: 'SELF_RESOLUTION_FORBIDDEN' },
        });
      }
      if (error?.message?.includes('APPEAL_ALREADY_RESOLVED')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error: { code: 'APPEAL_ALREADY_RESOLVED' },
        });
      }
      next(error);
    }
  }
}
