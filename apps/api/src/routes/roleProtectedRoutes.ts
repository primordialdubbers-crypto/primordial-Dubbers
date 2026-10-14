import { Router, Response } from 'express';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { RANK_TIERS, AWARDS_CATALOG, DEDUCTIONS_CATALOG } from '@pdi/shared';

const router = Router();

// Student Protected Route
router.get(
  '/student/dashboard-summary',
  authenticate,
  requireRole('student'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        role: 'student',
        user: req.user?.displayName,
        rankRules: RANK_TIERS,
        message: 'Welcome to your PDI Student Workspace. Phase 1 auth & RBAC active.',
      },
    });
  }
);

// Director Protected Route
router.get(
  '/director/workspace-summary',
  authenticate,
  requireRole('director'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        role: 'director',
        user: req.user?.displayName,
        message: 'Casting Director workspace active. Ready for review queue & rubric evaluations.',
      },
    });
  }
);

// Admin Protected Route
router.get(
  '/admin/overview-summary',
  authenticate,
  requireRole('admin'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        role: 'admin',
        user: req.user?.displayName,
        awardsCatalog: AWARDS_CATALOG,
        deductionsCatalog: DEDUCTIONS_CATALOG,
        message: 'Admin command dashboard active. Ready for approvals & system configuration.',
      },
    });
  }
);

export default router;
