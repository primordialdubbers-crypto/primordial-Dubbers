import { Router } from 'express';
import { register, login, logout, getCurrentUser, resetPassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
