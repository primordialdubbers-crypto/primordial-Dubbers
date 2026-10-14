import mongoose from 'mongoose';
import {
  calculateRankFromPoints,
  getRankProgress,
  PointSourceType,
  RankTier,
} from '@pdi/shared';
import {
  ArtistProfile,
  IPointProposal,
  IPointTransaction,
  IRankEvent,
  PointProposal,
  PointTransaction,
  RankEvent,
  User,
} from '../models/index.js';
import { runInTransaction } from './transactionRunner.js';
import { NotificationService } from './notificationService.js';

export interface ApplyPointsInput {
  studentId: string;
  delta: number;
  actorId: string;
  reason: string;
  category: string;
  idempotencyKey: string;
  proposalId?: string | null;
  decisionNote?: string;
  sourceId?: string;
  reversalOf?: string | null;
  session?: mongoose.ClientSession | null;
}


export interface PointMutationResult {
  transaction: IPointTransaction;
  balanceBefore: number;
  balanceAfter: number;
  oldRank: RankTier;
  newRank: RankTier;
  rankChanged: boolean;
  rankEvent: IRankEvent | null;
  wasIdempotent: boolean;
}

export class PointsService {
  /**
   * Applies an authoritative points mutation (award or deduction) in an ACID transaction.
   * Enforces:
   * 1. Idempotency key deduplication (returns existing transaction if duplicate key).
   * 2. Non-negative balance protection: newBalance = Math.max(0, oldBalance + delta).
   * 3. Server-authoritative rank threshold calculation.
   * 4. Audit trail logging in rankEvents on rank promotion or demotion.
   */
  static async applyPointMutation(input: ApplyPointsInput): Promise<PointMutationResult> {
    const {
      studentId,
      delta,
      actorId,
      reason,
      category,
      idempotencyKey,
      proposalId,
      decisionNote,
      sourceId,
      reversalOf,
      session: existingSession,
    } = input;

    // Check idempotency prior to entering transaction (fast-path read)
    const existingTx = await PointTransaction.findOne({ idempotencyKey });
    if (existingTx) {
      const profile = await ArtistProfile.findOne({ userId: studentId });
      return {
        transaction: existingTx,
        balanceBefore: existingTx.balanceBefore,
        balanceAfter: existingTx.balanceAfter,
        oldRank: profile ? profile.currentRank : calculateRankFromPoints(existingTx.balanceAfter),
        newRank: profile ? profile.currentRank : calculateRankFromPoints(existingTx.balanceAfter),
        rankChanged: false,
        rankEvent: null,
        wasIdempotent: true,
      };
    }

    const executeMutation = async (session: mongoose.ClientSession | null): Promise<PointMutationResult> => {
      // 1. Re-check idempotency inside transaction for race-condition prevention
      const concurrentTx = await PointTransaction.findOne({ idempotencyKey }).session(session);
        if (concurrentTx) {
          const profile = await ArtistProfile.findOne({ userId: studentId }).session(session);
          return {
            transaction: concurrentTx,
            balanceBefore: concurrentTx.balanceBefore,
            balanceAfter: concurrentTx.balanceAfter,
            oldRank: profile ? profile.currentRank : calculateRankFromPoints(concurrentTx.balanceAfter),
            newRank: profile ? profile.currentRank : calculateRankFromPoints(concurrentTx.balanceAfter),
            rankChanged: false,
            rankEvent: null,
            wasIdempotent: true,
          };
        }

        // 2. If linked to a proposal, atomically lock and approve proposal FIRST to prevent concurrent double-approvals
        if (proposalId) {
          const proposalUpdate: any = {
            status: 'approved',
            decidedBy: new mongoose.Types.ObjectId(actorId),
            decidedAt: new Date(),
          };
          if (decisionNote) {
            proposalUpdate.decisionNote = decisionNote;
          }

          const lockedProposal = await PointProposal.findOneAndUpdate(
            { _id: proposalId, status: 'pending' },
            proposalUpdate,
            { session: session || undefined, new: true }
          );

          if (!lockedProposal) {
            throw new Error('PROPOSAL_ALREADY_DECIDED: Proposal is no longer pending or has already been decided');
          }
        }

        // 3. Fetch and lock ArtistProfile
        let profile = await ArtistProfile.findOne({ userId: studentId }).session(session);

        if (!profile) {
          // Verify User exists
          const user = await User.findById(studentId).session(session);
          if (!user) {
            throw new Error(`STUDENT_NOT_FOUND: User ID ${studentId} does not exist`);
          }
          // Create profile if missing
          profile = new ArtistProfile({
            userId: user._id,
            displayName: user.displayName,
            rankPoints: 0,
            currentRank: 'ED',
            publicOptIn: true,
          });
          await profile.save({ session: session || undefined });
        }

        const balanceBefore = profile.rankPoints;
        // Protected non-negative invariant: max(0, oldBalance + delta)
        const balanceAfter = Math.max(0, balanceBefore + delta);

        const oldRank = profile.currentRank;
        const newRank = calculateRankFromPoints(balanceAfter);
        const rankChanged = oldRank !== newRank;

        // 4. Create immutable PointTransaction ledger entry
        const txDoc = new PointTransaction({
          studentId: new mongoose.Types.ObjectId(studentId),
          proposalId: proposalId ? new mongoose.Types.ObjectId(proposalId) : null,
          delta,
          balanceBefore,
          balanceAfter,
          actorId: new mongoose.Types.ObjectId(actorId),
          reason,
          category,
          sourceId: sourceId || null,
          reversalOf: reversalOf ? new mongoose.Types.ObjectId(reversalOf) : null,
          idempotencyKey,
          createdAt: new Date(),
        });

        await txDoc.save({ session: session || undefined });

        // 5. If rank changed (promoted or demoted), create RankEvent audit record
        let rankEvent: IRankEvent | null = null;
        if (rankChanged) {
          rankEvent = new RankEvent({
            studentId: new mongoose.Types.ObjectId(studentId),
            oldRank,
            newRank,
            pointsAtEvent: balanceAfter,
            triggeringTransactionId: txDoc._id,
            createdAt: new Date(),
          });
          await rankEvent.save({ session: session || undefined });
        }

        // 6. Update ArtistProfile
        profile.rankPoints = balanceAfter;
        profile.currentRank = newRank;
        profile.version = (profile.version || 1) + 1;
        await profile.save({ session: session || undefined });

        // Phase 7: Trigger In-App Notifications
        const pointsTitle = delta >= 0 ? 'Points Awarded' : 'Points Deducted';
        const pointsMessage = `${delta >= 0 ? '+' : ''}${delta} PTS: ${reason} (New Balance: ${balanceAfter} PTS)`;
        await NotificationService.createNotification({
          recipientId: studentId,
          title: pointsTitle,
          message: pointsMessage,
          type: 'points_awarded',
          linkUrl: '/student/ledger',
          session: session || undefined,
        });

        if (rankChanged) {
          const rankTitle = `Rank Changed: ${newRank}`;
          const isPromotion = balanceAfter >= balanceBefore;
          const rankMessage = isPromotion
            ? `Congratulations! You have advanced to Rank ${newRank} with ${balanceAfter} PTS.`
            : `Notice: Your rank has updated to Rank ${newRank} with ${balanceAfter} PTS.`;
          await NotificationService.createNotification({
            recipientId: studentId,
            title: rankTitle,
            message: rankMessage,
            type: 'rank_change',
            linkUrl: '/student/ledger',
            session: session || undefined,
          });
        }

        return {
          transaction: txDoc,
          balanceBefore,
          balanceAfter,
          oldRank,
          newRank,
          rankChanged,
          rankEvent,
          wasIdempotent: false,
        };
      };

    try {
      if (existingSession !== undefined) {
        return await executeMutation(existingSession);
      }
      return await runInTransaction<PointMutationResult>(executeMutation);
    } catch (error: any) {
      // Handle high-concurrency race condition on unique idempotencyKey index (MongoDB E11000)
      if (
        error?.code === 11000 &&
        (error?.keyPattern?.idempotencyKey || error?.message?.includes('idempotencyKey'))
      ) {
        const existingTx = await PointTransaction.findOne({ idempotencyKey });
        if (existingTx) {
          const profile = await ArtistProfile.findOne({ userId: studentId });
          return {
            transaction: existingTx,
            balanceBefore: existingTx.balanceBefore,
            balanceAfter: existingTx.balanceAfter,
            oldRank: profile ? profile.currentRank : calculateRankFromPoints(existingTx.balanceAfter),
            newRank: profile ? profile.currentRank : calculateRankFromPoints(existingTx.balanceAfter),
            rankChanged: false,
            rankEvent: null,
            wasIdempotent: true,
          };
        }
      }
      throw error;
    }
  }

  /**
   * Creates a point proposal submitted by a director or administrator.
   */
  static async createProposal(data: {
    studentId: string;
    delta: number;
    category: string;
    reason: string;
    sourceType: PointSourceType;
    sourceId?: string;
    evidenceIds?: string[];
    requestedBy: string;
    idempotencyKey: string;
  }): Promise<IPointProposal> {
    const existing = await PointProposal.findOne({ idempotencyKey: data.idempotencyKey });
    if (existing) {
      return existing;
    }

    const studentUser = await User.findById(data.studentId);
    if (!studentUser) {
      throw new Error(`STUDENT_NOT_FOUND: User ID ${data.studentId} not found`);
    }

    // PRD & Phase 3: Guard against self-proposals
    if (data.studentId.toString() === data.requestedBy.toString()) {
      throw new Error('SELF_PROPOSAL_FORBIDDEN: Directors and administrators cannot submit point proposals for themselves');
    }

    const proposal = new PointProposal({
      studentId: new mongoose.Types.ObjectId(data.studentId),
      delta: data.delta,
      category: data.category,
      reason: data.reason,
      sourceType: data.sourceType,
      sourceId: data.sourceId || null,
      evidenceIds: data.evidenceIds || [],
      status: 'pending',
      requestedBy: new mongoose.Types.ObjectId(data.requestedBy),
      idempotencyKey: data.idempotencyKey,
    });

    try {
      return await proposal.save();
    } catch (err: any) {
      // Concurrency race duplicate check
      if (
        err?.code === 11000 &&
        (err?.keyPattern?.idempotencyKey || err?.message?.includes('idempotencyKey'))
      ) {
        const existingRace = await PointProposal.findOne({ idempotencyKey: data.idempotencyKey });
        if (existingRace) return existingRace;
      }
      throw err;
    }
  }

  /**
   * Approves a pending point proposal and executes the ACID point transaction.
   * PRD requirement: Rejects self-approval where policy forbids it.
   */
  static async approveProposal(
    proposalId: string,
    decidedBy: string,
    decisionNote?: string
  ): Promise<PointMutationResult> {
    const proposal = await PointProposal.findById(proposalId);
    if (!proposal) {
      throw new Error('PROPOSAL_NOT_FOUND: Point proposal not found');
    }

    if (proposal.status !== 'pending') {
      throw new Error(`PROPOSAL_ALREADY_DECIDED: Proposal is already ${proposal.status}`);
    }

    // PRD: Reject unauthorized or self-approval where policy forbids it
    if (proposal.requestedBy.toString() === decidedBy) {
      throw new Error('SELF_APPROVAL_FORBIDDEN: Requesters cannot approve their own point proposals');
    }
    if (proposal.studentId.toString() === decidedBy) {
      throw new Error('SELF_APPROVAL_FORBIDDEN: Administrators cannot approve point proposals for themselves');
    }

    const result = await this.applyPointMutation({
      studentId: proposal.studentId.toString(),
      delta: proposal.delta,
      actorId: decidedBy,
      reason: proposal.reason,
      category: proposal.category,
      proposalId: proposal._id.toString(),
      decisionNote,
      sourceId: proposal.sourceId || undefined,
      idempotencyKey: `approval_${proposal.idempotencyKey}`,
    });

    if (result.wasIdempotent) {
      throw new Error('PROPOSAL_ALREADY_DECIDED: Proposal is already approved');
    }

    return result;
  }

  /**
   * Rejects a pending point proposal.
   */
  static async rejectProposal(
    proposalId: string,
    decidedBy: string,
    decisionNote?: string
  ): Promise<IPointProposal> {
    const updated = await PointProposal.findOneAndUpdate(
      { _id: proposalId, status: 'pending' },
      {
        status: 'rejected',
        decidedBy: new mongoose.Types.ObjectId(decidedBy),
        decidedAt: new Date(),
        ...(decisionNote ? { decisionNote } : {}),
      },
      { new: true }
    );

    if (updated) {
      return updated;
    }

    const proposal = await PointProposal.findById(proposalId);
    if (!proposal) {
      throw new Error('PROPOSAL_NOT_FOUND: Point proposal not found');
    }

    throw new Error(`PROPOSAL_ALREADY_DECIDED: Proposal is already ${proposal.status}`);
  }

  /**
   * Retrieves points ledger history and summary for a student.
   */
  static async getPointsHistory(studentId: string) {
    const profile = await ArtistProfile.findOne({ userId: studentId });
    const currentPoints = profile ? profile.rankPoints : 0;
    const currentRank = profile ? profile.currentRank : 'ED';

    const progressInfo = getRankProgress(currentPoints);

    const transactions = await PointTransaction.find({ studentId })
      .sort({ createdAt: -1 })
      .populate('actorId', 'displayName email')
      .lean();

    let totalEarned = 0;
    let totalDeducted = 0;

    for (const tx of transactions) {
      if (tx.delta > 0) {
        totalEarned += tx.delta;
      } else {
        totalDeducted += Math.abs(tx.delta);
      }
    }

    return {
      currentPoints,
      currentRank,
      nextRank: progressInfo.nextTier,
      pointsToNextRank: progressInfo.pointsToNextTier,
      rankProgressPercent: progressInfo.progressPercent,
      totalEarned,
      totalDeducted,
      transactions: transactions.map((t) => ({
        id: t._id.toString(),
        studentId: t.studentId.toString(),
        proposalId: t.proposalId ? t.proposalId.toString() : null,
        delta: t.delta,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        actorId: (t.actorId as any)?._id?.toString() || t.actorId.toString(),
        actorName: (t.actorId as any)?.displayName || 'System Admin',
        reason: t.reason,
        category: t.category,
        sourceId: t.sourceId,
        reversalOf: t.reversalOf ? t.reversalOf.toString() : null,
        idempotencyKey: t.idempotencyKey,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Retrieves rank events audit history for a student.
   */
  static async getRankHistory(studentId: string) {
    const events = await RankEvent.find({ studentId })
      .sort({ createdAt: -1 })
      .populate('triggeringTransactionId', 'delta reason createdAt')
      .lean();

    return events.map((e) => {
      const txObj = e.triggeringTransactionId as any;
      const txId = txObj?._id ? txObj._id.toString() : (txObj ? txObj.toString() : '');

      return {
        id: e._id.toString(),
        studentId: e.studentId.toString(),
        oldRank: e.oldRank,
        newRank: e.newRank,
        pointsAtEvent: e.pointsAtEvent,
        triggeringTransactionId: txId,
        createdAt: e.createdAt.toISOString(),
        details: txObj && typeof txObj === 'object' ? txObj : null,
      };
    });
  }
}

