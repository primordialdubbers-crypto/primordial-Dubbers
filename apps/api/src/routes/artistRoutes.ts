import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { ArtistController } from '../controllers/artistController.js';

const router = Router();

// Current user profile endpoints
router.get('/me/profile', requireAuth, ArtistController.getMyProfile);
router.patch('/me/profile', requireAuth, ArtistController.updateMyProfile);

// Public / shared artist profile endpoint (with optionalAuth for private profile access control)
router.get('/artists/:userId', optionalAuth, ArtistController.getArtistProfile);

export default router;

