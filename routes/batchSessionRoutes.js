import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, generate, show, start, complete } from '../controllers/batchSessionController.js';

const router = Router();
router.get('/batch-sessions', requireAuth, index);
router.post('/batch-sessions/generate', requireAuth, generate);
router.get('/batch-sessions/:id', requireAuth, show);
router.post('/batch-sessions/:id/start', requireAuth, start);
router.post('/batch-sessions/:id/complete', requireAuth, complete);
export default router;