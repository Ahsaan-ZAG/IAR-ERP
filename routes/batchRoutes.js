import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { list, show } from '../controllers/batchController.js';

const router = Router();
router.get('/batches', requireAuth, list);
router.get('/batches/:id', requireAuth, show);
export default router;