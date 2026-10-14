import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { PointsController } from '../controllers/pointsController.js';


const router = Router();

// Student authenticated endpoints
router.get('/me/points', requireAuth, PointsController.getMyPoints);
router.get('/me/rank-history', requireAuth, PointsController.getMyRankHistory);

// Director proposal submission
router.post(
  '/director/point-proposals',
  requireAuth,
  requireRole('director', 'admin', 'superadmin'),
  PointsController.createPointProposal
);

// Admin review of points proposals & approvals
router.get(
  '/admin/point-proposals',
  requireAuth,
  requireRole('admin', 'superadmin'),
  PointsController.getPointProposals
);

router.post(
  '/admin/point-proposals/:id/approve',
  requireAuth,
  requireRole('admin', 'superadmin'),
  PointsController.approvePointProposal
);

router.post(
  '/admin/point-proposals/:id/reject',
  requireAuth,
  requireRole('admin', 'superadmin'),
  PointsController.rejectPointProposal
);

// Admin direct point adjustments (authoritative ledger mutations)
router.post(
  '/admin/points/adjust',
  requireAuth,
  requireRole('admin', 'superadmin'),
  PointsController.adjustPoints
);

// Inspection of an artist's points ledger (admin & director)
router.get(
  '/artists/:userId/points',
  requireAuth,
  requireRole('admin', 'director', 'superadmin'),
  PointsController.getArtistPoints
);

export default router;
