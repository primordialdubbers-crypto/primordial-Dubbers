import mongoose from 'mongoose';
import { Challenge, ISubmission, Submission } from '../models/index.js';
import { CreateSubmissionInput } from '@pdi/shared';

export class SubmissionService {
  /**
   * Records a student audition take submission.
   */
  static async createSubmission(
    input: CreateSubmissionInput,
    studentId: string
  ): Promise<ISubmission> {
    if (!mongoose.Types.ObjectId.isValid(input.challengeId)) {
      throw new Error('INVALID_CHALLENGE_ID: Challenge identifier is invalid');
    }

    const challenge = await Challenge.findById(input.challengeId);
    if (!challenge) {
      throw new Error('CHALLENGE_NOT_FOUND: Challenge does not exist');
    }

    if (!challenge.isActive) {
      throw new Error('CHALLENGE_INACTIVE: This audition challenge is no longer accepting submissions');
    }

    const submission = new Submission({
      studentId: new mongoose.Types.ObjectId(studentId),
      challengeId: new mongoose.Types.ObjectId(input.challengeId),
      audioUrl: input.audioUrl,
      durationSeconds: input.durationSeconds,
      mimeType: input.mimeType,
      submissionType: input.submissionType || 'uploaded',
      syncOffsetMs: input.syncOffsetMs !== undefined ? input.syncOffsetMs : 0,
      notes: input.notes || '',
      status: 'submitted',
    });

    return await submission.save();
  }

  /**
   * Retrieves all audition submissions made by a student.
   */
  static async getStudentSubmissions(studentId: string) {
    const submissions = await Submission.find({ studentId })
      .sort({ createdAt: -1 })
      .populate('challengeId', 'title characterName difficulty targetRank referenceMediaUrl')
      .lean();

    return submissions.map((s) => {
      const challenge = s.challengeId as any;
      return {
        id: s._id.toString(),
        studentId: s.studentId.toString(),
        challengeId: challenge?._id ? challenge._id.toString() : (challenge ? challenge.toString() : ''),
        challengeTitle: challenge?.title || 'Audition Challenge',
        characterName: challenge?.characterName || 'Character',
        difficulty: challenge?.difficulty || 'Beginner',
        targetRank: challenge?.targetRank || 'ED',
        audioUrl: s.audioUrl,
        durationSeconds: s.durationSeconds,
        mimeType: s.mimeType,
        submissionType: s.submissionType,
        syncOffsetMs: s.syncOffsetMs || 0,
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves submissions for a specific challenge (directors / staff).
   */
  static async getChallengeSubmissions(challengeId: string) {
    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      throw new Error('INVALID_CHALLENGE_ID: Invalid challenge ID');
    }

    const submissions = await Submission.find({ challengeId })
      .sort({ createdAt: -1 })
      .populate('studentId', 'displayName email')
      .lean();

    return submissions.map((s) => {
      const student = s.studentId as any;
      return {
        id: s._id.toString(),
        studentId: student?._id ? student._id.toString() : s.studentId.toString(),
        studentName: student?.displayName || 'Unknown Student',
        studentEmail: student?.email || '',
        challengeId: s.challengeId.toString(),
        audioUrl: s.audioUrl,
        durationSeconds: s.durationSeconds,
        mimeType: s.mimeType,
        submissionType: s.submissionType,
        syncOffsetMs: s.syncOffsetMs || 0,
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    });
  }
}
