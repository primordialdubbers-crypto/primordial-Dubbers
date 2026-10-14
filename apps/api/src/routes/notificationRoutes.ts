import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { NotificationController } from '../controllers/notificationController.js';

const router = Router();

// All notification routes require authenticated session
router.use(requireAuth);

router.get('/', NotificationController.getNotifications);
router.patch('/:id/read', NotificationController.markRead);
router.post('/read-all', NotificationController.markAllRead);

export default router;
