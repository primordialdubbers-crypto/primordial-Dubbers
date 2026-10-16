import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getCurrentUser, resetPassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Dedicated login rate limiter to protect against credential stuffing/brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 25, // 25 attempts per 15 mins in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    error: { code: 'LOGIN_RATE_LIMIT_EXCEEDED' },
  },
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
