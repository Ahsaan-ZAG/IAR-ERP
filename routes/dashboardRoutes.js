import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { dashboard } from '../controllers/dashboardController.js';

const router = Router();
router.get('/dashboard', requireAuth, dashboard);
export default router;