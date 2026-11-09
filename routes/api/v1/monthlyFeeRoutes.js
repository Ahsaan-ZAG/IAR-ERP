import { Router } from 'express';
import { getMonthlyFees } from '../../../controllers/api/v1/monthlyFeeController.js';

const router = Router();
router.get('/', getMonthlyFees);

export default router;