import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppealController } from '../controllers/appealController.js';

const router = Router();

// Student appeal submission and listing
router.post('/me/appeals', requireAuth, AppealController.submitAppeal);
router.get('/me/appeals', requireAuth, AppealController.getMyAppeals);

// Administrative appeals management and resolution
router.get(
  '/admin/appeals',
  requireAuth,
  requireRole('admin', 'superadmin'),
  AppealController.getAdminAppeals
);

router.post(
  '/admin/appeals/:id/resolve',
  requireAuth,
  requireRole('admin', 'superadmin'),
  AppealController.resolveAppeal
);

export default router;
