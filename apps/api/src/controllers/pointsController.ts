import { Request, Response, NextFunction } from 'express';
import {
  createPointTransactionSchema,
  createPointProposalSchema,
  decidePointProposalSchema,
} from '@pdi/shared';
import { PointsService } from '../services/pointsService.js';
import { PointProposal } from '../models/index.js';

export class PointsController {
  /**
   * GET /api/v1/me/points
   * Student views their personal points ledger, summary, and rank progress
   */
  static async getMyPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = (req as any).user?.id;
      const history = await PointsService.getPointsHistory(studentId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/me/rank-history
   * Student views their personal rank change events (promotions/demotions)
   */
  static async getMyRankHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = (req as any).user?.id;
      const rankEvents = await PointsService.getRankHistory(studentId);

      res.status(200).json({
        success: true,
        data: {
          rankEvents,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/artists/:userId/points
   * Admin or Director views artist's points ledger
   */
  static async getArtistPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const history = await PointsService.getPointsHistory(userId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/points/adjust
   * Authoritative direct point award or deduction executed by Admin/Superadmin
   */
  static async adjustPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.id;
      const parseResult = createPointTransactionSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid points adjustment payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const { studentId, delta, reason, category, sourceId, idempotencyKey } =
        parseResult.data;

      const result = await PointsService.applyPointMutation({
        studentId,
        delta,
        actorId,
        reason,
        category,
        sourceId,
        idempotencyKey,
      });

      res.status(result.wasIdempotent ? 200 : 201).json({
        success: true,
        data: {
          transaction: {
            id: result.transaction._id.toString(),
            studentId: result.transaction.studentId.toString(),
            delta: result.transaction.delta,
            balanceBefore: result.balanceBefore,
            balanceAfter: result.balanceAfter,
            idempotencyKey: result.transaction.idempotencyKey,
            createdAt: result.transaction.createdAt,
          },
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter,
          oldRank: result.oldRank,
          newRank: result.newRank,
          rankChanged: result.rankChanged,
          rankEvent: result.rankEvent
            ? {
                id: result.rankEvent._id.toString(),
                oldRank: result.rankEvent.oldRank,
                newRank: result.rankEvent.newRank,
                pointsAtEvent: result.rankEvent.pointsAtEvent,
              }
            : null,
          wasIdempotent: result.wasIdempotent,
        },
        message: result.wasIdempotent
          ? 'Idempotent request: transaction previously executed'
          : `Points successfully adjusted: ${delta > 0 ? '+' : ''}${delta}`,
      });
    } catch (error: any) {
      if (error?.message?.includes('STUDENT_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'STUDENT_NOT_FOUND' },
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/director/point-proposals
   * Casting director or admin submits a recommendation for award or deduction
   */
  static async createPointProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const requestedBy = (req as any).user?.id;
      const parseResult = createPointProposalSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid proposal payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const proposal = await PointsService.createProposal({
        ...parseResult.data,
        requestedBy,
      });

      res.status(201).json({
        success: true,
        data: {
          proposal: {
            id: proposal._id.toString(),
            studentId: proposal.studentId.toString(),
            delta: proposal.delta,
            category: proposal.category,
            reason: proposal.reason,
            sourceType: proposal.sourceType,
            status: proposal.status,
            requestedBy: proposal.requestedBy.toString(),
            idempotencyKey: proposal.idempotencyKey,
            createdAt: proposal.createdAt,
          },
        },
        message: 'Point proposal submitted for administrator approval',
      });
    } catch (error: any) {
      if (error?.message?.includes('SELF_PROPOSAL_FORBIDDEN')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          error: { code: 'SELF_PROPOSAL_FORBIDDEN' },
        });
      }
      if (error?.message?.includes('STUDENT_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'STUDENT_NOT_FOUND' },
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/point-proposals
   * Admin reviews list of point proposals with status filters, pagination, and search
   */
  static async getPointProposals(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page = '1', limit = '20', search } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const filter: Record<string, any> = {};

      if (status && typeof status === 'string' && status !== 'all') {
        filter.status = status;
      }

      if (search && typeof search === 'string' && search.trim()) {
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escaped, 'i');
        filter.$or = [
          { category: searchRegex },
          { reason: searchRegex },
        ];
      }

      const [proposals, total] = await Promise.all([
        PointProposal.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('studentId', 'displayName email')
          .populate('requestedBy', 'displayName email')
          .populate('decidedBy', 'displayName email')
          .lean(),
        PointProposal.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          proposals: proposals.map((p) => ({
            id: p._id.toString(),
            studentId: (p.studentId as any)?._id?.toString() || p.studentId.toString(),
            studentName: (p.studentId as any)?.displayName || 'Unknown Student',
            studentEmail: (p.studentId as any)?.email,
            delta: p.delta,
            category: p.category,
            reason: p.reason,
            sourceType: p.sourceType,
            status: p.status,
            requestedBy: (p.requestedBy as any)?._id?.toString() || p.requestedBy.toString(),
            requesterName: (p.requestedBy as any)?.displayName || 'Director',
            decidedBy: p.decidedBy ? ((p.decidedBy as any)?._id?.toString() || p.decidedBy.toString()) : null,
            deciderName: (p.decidedBy as any)?.displayName || null,
            decidedAt: p.decidedAt ? p.decidedAt.toISOString() : null,
            decisionNote: p.decisionNote,
            createdAt: p.createdAt.toISOString(),
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/point-proposals/:id/approve
   * Admin approves proposal -> commits atomic point transaction
   */
  static async approvePointProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.id;
      const { id } = req.params;
      const { decisionNote } = req.body || {};

      const result = await PointsService.approveProposal(id, actorId, decisionNote);

      res.status(200).json({
        success: true,
        data: {
          transaction: {
            id: result.transaction._id.toString(),
            studentId: result.transaction.studentId.toString(),
            delta: result.transaction.delta,
            balanceBefore: result.balanceBefore,
            balanceAfter: result.balanceAfter,
            createdAt: result.transaction.createdAt,
          },
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter,
          oldRank: result.oldRank,
          newRank: result.newRank,
          rankChanged: result.rankChanged,
          rankEvent: result.rankEvent
            ? {
                id: result.rankEvent._id.toString(),
                oldRank: result.rankEvent.oldRank,
                newRank: result.rankEvent.newRank,
                pointsAtEvent: result.rankEvent.pointsAtEvent,
              }
            : null,
        },
        message: `Proposal approved and transaction committed (${result.transaction.delta > 0 ? '+' : ''}${result.transaction.delta} pts)`,
      });
    } catch (error: any) {
      if (error?.message?.includes('SELF_APPROVAL_FORBIDDEN')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          error: { code: 'SELF_APPROVAL_FORBIDDEN' },
        });
      }
      if (error?.message?.includes('PROPOSAL_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'PROPOSAL_NOT_FOUND' },
        });
      }
      if (error?.message?.includes('PROPOSAL_ALREADY_DECIDED')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error: { code: 'PROPOSAL_ALREADY_DECIDED' },
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/point-proposals/:id/reject
   * Admin rejects proposal
   */
  static async rejectPointProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.id;
      const { id } = req.params;
      const parseResult = decidePointProposalSchema.safeParse({
        decision: 'reject',
        decisionNote: req.body?.decisionNote,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid rejection payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const proposal = await PointsService.rejectProposal(
        id,
        actorId,
        parseResult.data.decisionNote
      );

      res.status(200).json({
        success: true,
        data: {
          proposal: {
            id: proposal._id.toString(),
            status: proposal.status,
            decidedBy: proposal.decidedBy?.toString(),
            decidedAt: proposal.decidedAt,
            decisionNote: proposal.decisionNote,
          },
        },
        message: 'Point proposal rejected',
      });
    } catch (error: any) {
      if (error?.message?.includes('PROPOSAL_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'PROPOSAL_NOT_FOUND' },
        });
      }
      if (error?.message?.includes('PROPOSAL_ALREADY_DECIDED')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error: { code: 'PROPOSAL_ALREADY_DECIDED' },
        });
      }
      next(error);
    }
  }
}
