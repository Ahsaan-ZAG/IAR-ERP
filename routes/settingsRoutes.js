import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { index, update } from '../controllers/settingsController.js';

const router = Router();
router.get('/settings', requireAuth, requireAdmin, index);
router.post('/settings', requireAuth, requireAdmin, update);
export default router;