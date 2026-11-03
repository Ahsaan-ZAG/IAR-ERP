import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, show, postReceive, postReverse, downloadReceipt } from '../controllers/paymentController.js';
import { paymentRules, reverseRules } from '../validators/feeValidators.js';

const router = Router();
router.get('/payments', requireAuth, index);
router.post('/payments/receive', requireAuth, paymentRules, postReceive);
router.get('/payments/:id', requireAuth, show);
router.get('/payments/:id/receipt.pdf', requireAuth, downloadReceipt);
router.post('/payments/:id/reverse', requireAuth, reverseRules, postReverse);
export default router;