import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, collectFee } from '../controllers/monthlyFeeController.js';

const router = Router();
router.get('/monthly-fees', requireAuth, index);
router.post('/monthly-fees/collect', requireAuth, collectFee);

export default router;
