import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  showLogin, login, logout, showMobileLogin, mobileLogin,
} from '../controllers/authController.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

router.get('/login', showLogin);
router.post('/auth/login', loginLimiter, login);
router.post('/auth/logout', logout);

router.get('/mobile/login', showMobileLogin);
router.post('/mobile/auth/login', loginLimiter, mobileLogin);

export default router;