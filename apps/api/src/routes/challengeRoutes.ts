import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ChallengeController } from '../controllers/challengeController.js';

const router = Router();

// Public / student challenge discovery
router.get('/challenges', ChallengeController.listChallenges);
router.get('/challenges/:id', ChallengeController.getChallengeById);

// Staff / administrative challenge management
router.post(
  '/admin/challenges',
  requireAuth,
  requireRole('admin', 'director', 'superadmin'),
  ChallengeController.createChallenge
);

router.put(
  '/admin/challenges/:id',
  requireAuth,
  requireRole('admin', 'director', 'superadmin'),
  ChallengeController.updateChallenge
);

router.patch(
  '/admin/challenges/:id',
  requireAuth,
  requireRole('admin', 'director', 'superadmin'),
  ChallengeController.updateChallenge
);

router.delete(
  '/admin/challenges/:id',
  requireAuth,
  requireRole('admin', 'superadmin'),
  ChallengeController.deleteChallenge
);

export default router;
