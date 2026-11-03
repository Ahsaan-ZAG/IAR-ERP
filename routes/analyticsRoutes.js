import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { page, serveChart } from '../controllers/analyticsController.js';

const router = Router();
router.get('/analytics', requireAuth, page);
router.get('/analytics/chart/:name', requireAuth, serveChart);
export default router;