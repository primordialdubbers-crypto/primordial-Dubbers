import mongoose from 'mongoose';
import {
  Appeal,
  IAppeal,
  PointTransaction,
  User,
} from '../models/index.js';
import { PointsService } from './pointsService.js';
import { NotificationService } from './notificationService.js';
import { runInTransaction } from './transactionRunner.js';

export interface CreateAppealInput {
  studentId: string;
  transactionId: string;
  reason: string;
  evidenceText?: string;
}

export interface ResolveAppealInput {
  appealId: string;
  actorId: string;
  decision: 'grant' | 'reject' | 'granted' | 'rejected';
  decisionNote?: string;
}

export class AppealService {
  /**
   * Submits a student appeal contesting an approved deduction transaction.
   */
  static async createAppeal(input: CreateAppealInput): Promise<IAppeal> {
    const { studentId, transactionId, reason, evidenceText } = input;

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      throw new Error('INVALID_TRANSACTION_ID: The provided transaction ID is not a valid identifier');
    }

    const tx = await PointTransaction.findById(transactionId);
    if (!tx) {
      throw new Error('TRANSACTION_NOT_FOUND: The contested deduction transaction does not exist');
    }

    if (tx.studentId.toString() !== studentId) {
      throw new Error('FORBIDDEN_TRANSACTION: You can only appeal deductions applied to your own account');
    }

    // Must be an approved deduction (delta < 0)
    if (tx.delta >= 0) {
      throw new Error('INVALID_APPEAL_TARGET: Only deduction transactions (negative points) can be appealed');
    }

    // Check for existing pending or granted appeal for this transaction
    const existingAppeal = await Appeal.findOne({
      transactionId: tx._id,
      status: { $in: ['pending', 'granted'] },
    });

    if (existingAppeal) {
      if (existingAppeal.status === 'granted') {
        throw new Error('APPEAL_ALREADY_GRANTED: This deduction has already been successfully appealed and reversed');
      }
      throw new Error('APPEAL_ALREADY_PENDING: An appeal is already pending administrative review for this transaction');
    }

    const appeal = new Appeal({
      studentId: new mongoose.Types.ObjectId(studentId),
      transactionId: tx._id,
      reason,
      evidenceText: evidenceText || '',
      status: 'pending',
    });

    try {
      return await appeal.save();
    } catch (err: any) {
      if (
        err?.code === 11000 &&
        (err?.keyPattern?.transactionId || err?.message?.includes('transactionId'))
      ) {
        throw new Error('APPEAL_ALREADY_PENDING: An appeal is already pending administrative review for this transaction');
      }
      throw err;
    }
  }

  /**
   * Retrieves a student's appeals history.
   */
  static async getStudentAppeals(studentId: string) {
    const appeals = await Appeal.find({ studentId })
      .sort({ createdAt: -1 })
      .populate('transactionId', 'delta reason category createdAt balanceAfter balanceBefore')
      .populate('decidedBy', 'displayName')
      .lean();

    return appeals.map((a) => {
      const tx = a.transactionId as any;
      return {
        id: a._id.toString(),
        studentId: a.studentId.toString(),
        transactionId: tx?._id ? tx._id.toString() : (tx ? tx.toString() : ''),
        transactionDelta: tx?.delta,
        transactionReason: tx?.reason,
        transactionCategory: tx?.category,
        reason: a.reason,
        evidenceText: a.evidenceText,
        status: a.status,
        decidedBy: a.decidedBy ? ((a.decidedBy as any)?._id?.toString() || a.decidedBy.toString()) : null,
        deciderName: (a.decidedBy as any)?.displayName || null,
        decidedAt: a.decidedAt ? a.decidedAt.toISOString() : null,
        decisionNote: a.decisionNote,
        reversalTransactionId: a.reversalTransactionId ? a.reversalTransactionId.toString() : null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves administrative appeals queue with pagination and status filters.
   */
  static async getAdminAppeals(query: {
    status?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const pageNum = Math.max(1, parseInt(query.page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    const [appeals, total] = await Promise.all([
      Appeal.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('studentId', 'displayName email')
        .populate('transactionId', 'delta reason category createdAt balanceAfter')
        .populate('decidedBy', 'displayName email')
        .lean(),
      Appeal.countDocuments(filter),
    ]);

    return {
      appeals: appeals.map((a) => {
        const student = a.studentId as any;
        const tx = a.transactionId as any;
        const decider = a.decidedBy as any;

        return {
          id: a._id.toString(),
          studentId: student?._id ? student._id.toString() : a.studentId.toString(),
          studentName: student?.displayName || 'Unknown Student',
          studentEmail: student?.email || '',
          transactionId: tx?._id ? tx._id.toString() : (tx ? tx.toString() : ''),
          transactionDelta: tx?.delta,
          transactionReason: tx?.reason,
          transactionCategory: tx?.category,
          reason: a.reason,
          evidenceText: a.evidenceText,
          status: a.status,
          decidedBy: decider?._id ? decider._id.toString() : (a.decidedBy ? a.decidedBy.toString() : null),
          deciderName: decider?.displayName || null,
          decidedAt: a.decidedAt ? a.decidedAt.toISOString() : null,
          decisionNote: a.decisionNote,
          reversalTransactionId: a.reversalTransactionId ? a.reversalTransactionId.toString() : null,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
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
   * Resolves an appeal (grant or reject).
   * When granted: creates an additive inverse transaction, never modifying past records.
   * Atomically recalculates rank.
   */
  static async resolveAppeal(input: ResolveAppealInput) {
    const { appealId, actorId, decision, decisionNote } = input;
    const isGrant = decision === 'grant' || decision === 'granted';

    return await runInTransaction(async (session) => {
      // 1. Lock and retrieve appeal
      const appeal = await Appeal.findById(appealId).session(session);
      if (!appeal) {
        throw new Error('APPEAL_NOT_FOUND: Appeal request not found');
      }

      if (appeal.status !== 'pending') {
        throw new Error(`APPEAL_ALREADY_RESOLVED: Appeal is already ${appeal.status}`);
      }

      // Self-resolution forbidden: student cannot resolve their own appeal even if they are an admin
      if (appeal.studentId.toString() === actorId) {
        throw new Error('SELF_RESOLUTION_FORBIDDEN: Administrators cannot resolve their own appeals');
      }

      const originalTx = await PointTransaction.findById(appeal.transactionId).session(session);
      if (!originalTx) {
        throw new Error('TRANSACTION_NOT_FOUND: Original deduction transaction not found');
      }

      if (!isGrant) {
        // Rejection path
        appeal.status = 'rejected';
        appeal.decidedBy = new mongoose.Types.ObjectId(actorId);
        appeal.decidedAt = new Date();
        if (decisionNote) {
          appeal.decisionNote = decisionNote;
        }
        await appeal.save({ session: session || undefined });

        await NotificationService.createNotification({
          recipientId: appeal.studentId.toString(),
          title: 'Appeal Rejected',
          message: `Your appeal regarding "${originalTx.reason}" was reviewed and rejected.${decisionNote ? ` Note: ${decisionNote}` : ''}`,
          type: 'appeal_resolved',
          linkUrl: '/student/ledger',
          session: session || undefined,
        });

        return {
          appeal,
          reversed: false,
          mutationResult: null,
        };
      }

      // Grant path: Additive inverse transaction (+abs(delta))
      const reversalDelta = Math.abs(originalTx.delta);
      const idempotencyKey = `reversal_appeal_${appeal._id.toString()}`;

      const mutationResult = await PointsService.applyPointMutation({
        studentId: appeal.studentId.toString(),
        delta: reversalDelta,
        actorId,
        reason: `Reversal of deduction: ${appeal.reason}`,
        category: 'appeal_reversal',
        sourceId: appeal._id.toString(),
        reversalOf: originalTx._id.toString(),
        idempotencyKey,
        session,
      });

      appeal.status = 'granted';
      appeal.decidedBy = new mongoose.Types.ObjectId(actorId);
      appeal.decidedAt = new Date();
      appeal.reversalTransactionId = mutationResult.transaction._id;
      if (decisionNote) {
        appeal.decisionNote = decisionNote;
      }
      await appeal.save({ session: session || undefined });

      await NotificationService.createNotification({
        recipientId: appeal.studentId.toString(),
        title: 'Appeal Approved',
        message: `Your appeal regarding "${originalTx.reason}" was approved. ${reversalDelta} PTS have been restored to your balance.`,
        type: 'appeal_resolved',
        linkUrl: '/student/ledger',
        session: session || undefined,
      });

      return {
        appeal,
        reversed: true,
        mutationResult,
      };
    });
  }
}
