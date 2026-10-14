import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { EvaluationController } from '../controllers/evaluationController.js';

const router = Router();

// Casting directors & admins create or update 100-point rubric evaluations
router.post(
  '/evaluations',
  requireAuth,
  requireRole('director', 'admin', 'superadmin'),
  EvaluationController.createOrUpdateEvaluation
);

// Students (own submission) and directors/admins get evaluation details
router.get(
  '/evaluations/submission/:submissionId',
  requireAuth,
  EvaluationController.getEvaluationBySubmission
);

// Director review queue
router.get(
  '/director/review-queue',
  requireAuth,
  requireRole('director', 'admin', 'superadmin'),
  EvaluationController.getReviewQueue
);

export default router;
