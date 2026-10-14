import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { TalentController } from '../controllers/talentController.js';

const router = Router();

// Casting Director Talent Board endpoint
router.get(
  '/talents',
  requireAuth,
  requireRole('director', 'admin', 'superadmin'),
  TalentController.getTalents
);

export default router;
