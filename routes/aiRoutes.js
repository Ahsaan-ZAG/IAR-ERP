import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/authMiddleware.js';
import { page, ask } from '../controllers/aiController.js';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

router.get('/ai', requireAuth, page);
router.get('/ai/ask', requireAuth, aiLimiter, ask);

export default router;