import mongoose from 'mongoose';
import {
  calculateEvaluationGrade,
  CreateEvaluationInput,
  EvaluationRecord,
} from '@pdi/shared';
import {
  Challenge,
  Evaluation,
  IEvaluation,
  Submission,
  User,
} from '../models/index.js';
import { PointsService } from './pointsService.js';
import { NotificationService } from './notificationService.js';

export class EvaluationService {
  /**
   * Creates or updates a 100-point rubric evaluation for an audition submission.
   */
  static async upsertEvaluation(
    input: CreateEvaluationInput,
    directorId: string
  ): Promise<EvaluationRecord> {
    if (!mongoose.Types.ObjectId.isValid(input.submissionId)) {
      throw new Error('INVALID_SUBMISSION_ID: Submission identifier is invalid');
    }

    const submission = await Submission.findById(input.submissionId);
    if (!submission) {
      throw new Error('SUBMISSION_NOT_FOUND: Audition submission not found');
    }

    // Integrity Guard: Evaluator cannot evaluate their own audition submission
    if (submission.studentId.toString() === directorId.toString()) {
      throw new Error(
        'SELF_EVALUATION_FORBIDDEN: Evaluator cannot evaluate their own audition submission'
      );
    }

    let evaluation = await Evaluation.findOne({ submissionId: input.submissionId });

    // State Machine Guard: Finalized submitted evaluation cannot be reverted to draft
    if (evaluation && evaluation.status === 'submitted' && input.status === 'draft') {
      throw new Error(
        'FINALIZED_EVALUATION_LOCKED: Submitted evaluations cannot be reverted to draft status'
      );
    }

    // Calculate total score from PRD 5-component rubric
    const rawTotal =
      input.scores.acting +
      input.scores.timing +
      input.scores.pronunciation +
      input.scores.expression +
      input.scores.audio;
    const totalScore = Math.round(rawTotal * 10) / 10;

    const grade = calculateEvaluationGrade(totalScore);

    let pointProposalId: mongoose.Types.ObjectId | null = evaluation?.pointProposalId || null;

    // Optional director point proposal attachment (preserving locked rule: rubric does not automatically award points)
    if (input.attachPointProposal && input.pointProposalDelta !== undefined && input.pointProposalDelta !== 0) {
      const deterministicKey =
        input.idempotencyKey || `eval_prop_${submission._id.toString()}`;

      const proposal = await PointsService.createProposal({
        studentId: submission.studentId.toString(),
        delta: input.pointProposalDelta,
        category: input.pointProposalCategory || (input.pointProposalDelta > 0 ? 'review_award' : 'review_deduction'),
        reason:
          input.pointProposalReason ||
          `Evaluation review recommendation (Score ${totalScore}/100, Grade ${grade})`,
        sourceType: 'review',
        sourceId: submission._id.toString(),
        requestedBy: directorId,
        idempotencyKey: deterministicKey,
      });

      pointProposalId = proposal._id;
    }

    if (evaluation) {
      evaluation.directorId = new mongoose.Types.ObjectId(directorId);
      evaluation.scores = input.scores;
      evaluation.totalScore = totalScore;
      evaluation.grade = grade;
      evaluation.timestampComments = input.timestampComments || [];
      evaluation.summaryNotes = input.summaryNotes || '';
      evaluation.strengths = input.strengths || '';
      evaluation.areasForImprovement = input.areasForImprovement || '';
      evaluation.status = input.status || 'submitted';
      if (pointProposalId) {
        evaluation.pointProposalId = pointProposalId;
      }
      await evaluation.save();
    } else {
      evaluation = new Evaluation({
        submissionId: submission._id,
        directorId: new mongoose.Types.ObjectId(directorId),
        studentId: submission.studentId,
        challengeId: submission.challengeId,
        scores: input.scores,
        totalScore,
        grade,
        timestampComments: input.timestampComments || [],
        summaryNotes: input.summaryNotes || '',
        strengths: input.strengths || '',
        areasForImprovement: input.areasForImprovement || '',
        status: input.status || 'submitted',
        pointProposalId,
      });
      await evaluation.save();
    }

    // When finalized/submitted, update submission status to reviewed
    if (input.status === 'submitted') {
      await Submission.findByIdAndUpdate(submission._id, { status: 'reviewed' });

      // Phase 7: Trigger In-App Notification for audition evaluation
      const challenge = await Challenge.findById(submission.challengeId);
      const challengeTitle = challenge?.title || 'Audition Challenge';
      await NotificationService.createNotification({
        recipientId: submission.studentId.toString(),
        title: 'Audition Evaluation Ready',
        message: `Your audition for "${challengeTitle}" has been evaluated (Grade: ${grade}, Score: ${totalScore}/100).`,
        type: 'evaluation_ready',
        linkUrl: '/student/submissions',
      });
    }

    return await this.formatEvaluation(evaluation._id.toString());
  }

  /**
   * Retrieves the evaluation for a submission with permission checks.
   */
  static async getEvaluationForSubmission(
    submissionId: string,
    requestingUser: { id: string; roles: string[] }
  ): Promise<EvaluationRecord | null> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw new Error('INVALID_SUBMISSION_ID: Invalid submission identifier');
    }

    const evaluation = await Evaluation.findOne({ submissionId })
      .populate('directorId', 'displayName email')
      .populate('studentId', 'displayName email')
      .populate('challengeId', 'title characterName')
      .lean();

    if (!evaluation) {
      return null;
    }

    const isStaff = requestingUser.roles.some((r) =>
      ['director', 'admin', 'superadmin'].includes(r)
    );

    // If requesting user is student, they must own the submission and it must not be a draft
    if (!isStaff) {
      if (evaluation.studentId._id ? evaluation.studentId._id.toString() !== requestingUser.id : evaluation.studentId.toString() !== requestingUser.id) {
        throw new Error('FORBIDDEN: You do not have permission to view this evaluation');
      }
      if (evaluation.status === 'draft') {
        return null;
      }
    }

    const director = evaluation.directorId as any;
    const student = evaluation.studentId as any;
    const challenge = evaluation.challengeId as any;

    return {
      id: evaluation._id.toString(),
      submissionId: evaluation.submissionId.toString(),
      directorId: director?._id ? director._id.toString() : evaluation.directorId.toString(),
      directorName: director?.displayName || 'Casting Director',
      studentId: student?._id ? student._id.toString() : evaluation.studentId.toString(),
      studentName: student?.displayName || 'Student Artist',
      challengeId: challenge?._id ? challenge._id.toString() : evaluation.challengeId.toString(),
      challengeTitle: challenge?.title || 'Audition Challenge',
      characterName: challenge?.characterName || 'Character',
      scores: evaluation.scores,
      totalScore: evaluation.totalScore,
      grade: evaluation.grade || calculateEvaluationGrade(evaluation.totalScore),
      timestampComments: evaluation.timestampComments || [],
      summaryNotes: evaluation.summaryNotes || '',
      strengths: evaluation.strengths || '',
      areasForImprovement: evaluation.areasForImprovement || '',
      status: evaluation.status,
      pointProposalId: evaluation.pointProposalId ? evaluation.pointProposalId.toString() : null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves pending submissions for the director review queue.
   */
  static async getDirectorReviewQueue() {
    const submissions = await Submission.find()
      .sort({ createdAt: -1 })
      .populate('studentId', 'displayName email')
      .populate('challengeId', 'title characterName difficulty targetRank referenceMediaUrl script')
      .lean();

    const evaluations = await Evaluation.find().lean();
    const evaluationMap = new Map<string, any>();
    for (const ev of evaluations) {
      evaluationMap.set(ev.submissionId.toString(), ev);
    }

    return submissions.map((sub) => {
      const student = sub.studentId as any;
      const challenge = sub.challengeId as any;
      const existingEvaluation = evaluationMap.get(sub._id.toString());

      return {
        id: sub._id.toString(),
        studentId: student?._id ? student._id.toString() : sub.studentId.toString(),
        studentName: student?.displayName || 'Student Artist',
        studentEmail: student?.email || '',
        challengeId: challenge?._id ? challenge._id.toString() : (sub.challengeId ? sub.challengeId.toString() : ''),
        challengeTitle: challenge?.title || (sub as any).customTitle || 'Custom Dubbing Clip',
        customTitle: (sub as any).customTitle || '',
        characterName: challenge?.characterName || (sub as any).characterName || 'Original Voice',
        difficulty: challenge?.difficulty || 'Practice',
        targetRank: challenge?.targetRank || 'ED',
        referenceMediaUrl: (sub as any).videoUrl || challenge?.referenceMediaUrl || '',
        videoUrl: (sub as any).videoUrl || challenge?.referenceMediaUrl || '',
        script: challenge?.script || '',
        audioUrl: sub.audioUrl,
        durationSeconds: sub.durationSeconds,
        mimeType: sub.mimeType,
        submissionType: sub.submissionType,
        syncOffsetMs: sub.syncOffsetMs || 0,
        status: sub.status,
        notes: sub.notes,
        createdAt: sub.createdAt.toISOString(),
        evaluation: existingEvaluation
          ? {
              id: existingEvaluation._id.toString(),
              totalScore: existingEvaluation.totalScore,
              grade: existingEvaluation.grade,
              status: existingEvaluation.status,
              scores: existingEvaluation.scores,
              timestampComments: existingEvaluation.timestampComments,
              summaryNotes: existingEvaluation.summaryNotes,
              strengths: existingEvaluation.strengths,
              areasForImprovement: existingEvaluation.areasForImprovement,
            }
          : null,
      };
    });
  }

  /**
   * Formats an evaluation document for API response.
   */
  private static async formatEvaluation(evaluationId: string): Promise<EvaluationRecord> {
    const evaluation = await Evaluation.findById(evaluationId)
      .populate('directorId', 'displayName email')
      .populate('studentId', 'displayName email')
      .populate('challengeId', 'title characterName')
      .lean();

    if (!evaluation) {
      throw new Error('EVALUATION_NOT_FOUND: Evaluation record not found');
    }

    const director = evaluation.directorId as any;
    const student = evaluation.studentId as any;
    const challenge = evaluation.challengeId as any;

    return {
      id: evaluation._id.toString(),
      submissionId: evaluation.submissionId.toString(),
      directorId: director?._id ? director._id.toString() : evaluation.directorId.toString(),
      directorName: director?.displayName || 'Casting Director',
      studentId: student?._id ? student._id.toString() : evaluation.studentId.toString(),
      studentName: student?.displayName || 'Student Artist',
      challengeId: challenge?._id ? challenge._id.toString() : (evaluation.challengeId ? evaluation.challengeId.toString() : ''),
      challengeTitle: challenge?.title || 'Audition Challenge',
      characterName: challenge?.characterName || 'Character',
      scores: evaluation.scores,
      totalScore: evaluation.totalScore,
      grade: evaluation.grade || calculateEvaluationGrade(evaluation.totalScore),
      timestampComments: evaluation.timestampComments || [],
      summaryNotes: evaluation.summaryNotes || '',
      strengths: evaluation.strengths || '',
      areasForImprovement: evaluation.areasForImprovement || '',
      status: evaluation.status,
      pointProposalId: evaluation.pointProposalId ? evaluation.pointProposalId.toString() : null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
    };
  }
}
