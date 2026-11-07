import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, postRead, postReadAll, postBroadcast } from '../controllers/notificationController.js';

const router = Router();
router.get('/notifications', requireAuth, index);
router.post('/notifications/:id/read', requireAuth, postRead);
router.post('/notifications/read-all', requireAuth, postReadAll);
router.post('/notifications/broadcast', requireAuth, postBroadcast);
export default router;