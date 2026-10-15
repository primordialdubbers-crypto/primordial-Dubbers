import { Request, Response, NextFunction } from 'express';
import { createSubmissionSchema } from '@pdi/shared';
import { SubmissionService } from '../services/submissionService.js';
import { storageService, ALLOWED_AUDIO_MIMES, MAX_AUDIO_FILE_SIZE } from '../services/storage/storageAdapter.js';

export class SubmissionController {
  /**
   * POST /api/v1/media/upload
   * Dedicated endpoint for uploading audio files
   */
  static async uploadAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No audio file provided in request',
          error: { code: 'FILE_MISSING' },
        });
      }

      const result = await storageService.uploadFile({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }, 'audio');

      res.status(201).json({
        success: true,
        data: result,
        message: 'Audio file uploaded successfully',
      });
    } catch (error: any) {
      if (
        error?.message?.includes('INVALID_AUDIO_FORMAT') ||
        error?.message?.includes('FILE_TOO_LARGE')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: { code: 'AUDIO_VALIDATION_ERROR' },
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/submissions
   * Student submits an audition take (JSON or multipart audio)
   */
  static async submitAudition(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = (req as any).user?.id;
      let audioUrl = req.body.audioUrl;
      let mimeType = req.body.mimeType;

      // If file was attached directly to this request
      if (req.file) {
        const uploadResult = await storageService.uploadFile({
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }, 'submissions');
        audioUrl = uploadResult.url;
        mimeType = uploadResult.mimeType;
      }

      const durationSeconds = req.body.durationSeconds
        ? parseFloat(req.body.durationSeconds)
        : undefined;

      const syncOffsetMs = req.body.syncOffsetMs !== undefined && req.body.syncOffsetMs !== ''
        ? parseInt(req.body.syncOffsetMs, 10)
        : 0;

      const parseResult = createSubmissionSchema.safeParse({
        challengeId: req.body.challengeId ? req.body.challengeId : null,
        customTitle: req.body.customTitle,
        characterName: req.body.characterName,
        audioUrl,
        videoUrl: req.body.videoUrl,
        durationSeconds,
        mimeType,
        submissionType: req.body.submissionType || 'uploaded',
        syncOffsetMs,
        notes: req.body.notes,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid audition submission payload',
          error: {
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten(),
          },
        });
      }

      const submission = await SubmissionService.createSubmission(
        parseResult.data,
        studentId
      );

      res.status(201).json({
        success: true,
        data: {
          submission: {
            id: submission._id.toString(),
            challengeId: submission.challengeId ? submission.challengeId.toString() : null,
            customTitle: submission.customTitle,
            characterName: submission.characterName,
            studentId: submission.studentId.toString(),
            audioUrl: submission.audioUrl,
            videoUrl: submission.videoUrl,
            durationSeconds: submission.durationSeconds,
            mimeType: submission.mimeType,
            submissionType: submission.submissionType,
            syncOffsetMs: submission.syncOffsetMs,
            status: submission.status,
            createdAt: submission.createdAt,
          },
        },
        message: 'Audition take submitted successfully',
      });
    } catch (error: any) {
      if (
        error?.message?.includes('INVALID_AUDIO_FORMAT') ||
        error?.message?.includes('FILE_TOO_LARGE') ||
        error?.message?.includes('INVALID_CHALLENGE_ID')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: { code: 'SUBMISSION_VALIDATION_ERROR' },
        });
      }
      if (error?.message?.includes('CHALLENGE_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'CHALLENGE_NOT_FOUND' },
        });
      }
      if (error?.message?.includes('CHALLENGE_INACTIVE')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error: { code: 'CHALLENGE_INACTIVE' },
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/my
   * Student views their own audition takes
   */
  static async getMySubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = (req as any).user?.id;
      const submissions = await SubmissionService.getStudentSubmissions(studentId);

      res.status(200).json({
        success: true,
        data: { submissions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/challenges/:id/submissions
   * Staff/directors view submissions for a specific challenge
   */
  static async getChallengeSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const submissions = await SubmissionService.getChallengeSubmissions(id);

      res.status(200).json({
        success: true,
        data: { submissions },
      });
    } catch (error) {
      next(error);
    }
  }
}
