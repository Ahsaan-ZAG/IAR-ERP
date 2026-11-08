import { Router } from 'express';
import { getDailyFinance, getMonthlyFinance } from '../../../controllers/api/v1/financialController.js';
const router = Router();
router.get('/daily', getDailyFinance);
router.get('/monthly', getMonthlyFinance);
export default router;