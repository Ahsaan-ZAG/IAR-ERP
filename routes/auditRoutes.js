import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index } from '../controllers/auditController.js';
const router = Router();
router.get('/audit-logs', requireAuth, index);
export default router;