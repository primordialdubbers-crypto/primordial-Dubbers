import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AdminUserController } from '../controllers/adminUserController.js';

const router = Router();

// All user management routes require admin or superadmin clearance
router.use(requireAuth);
router.use(requireRole('admin', 'superadmin'));

router.get('/users', AdminUserController.listUsers);
router.delete('/users/:userId', AdminUserController.deleteUser);
router.patch('/users/:userId/status', AdminUserController.updateUserStatus);
router.patch('/users/:userId/role', AdminUserController.updateUserRole);
router.post('/users/:userId/reset-password', AdminUserController.resetUserPassword);

export default router;
