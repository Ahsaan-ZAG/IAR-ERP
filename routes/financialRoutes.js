import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, postExpense, postClose } from '../controllers/financialController.js';
import { expenseRules } from '../validators/feeValidators.js';

const router = Router();
router.get('/financial', requireAuth, index);
router.post('/financial/expense', requireAuth, expenseRules, postExpense);
router.post('/financial/closing', requireAuth, postClose);
export default router;