import { Router } from 'express';
import { getPayments, postPayment } from '../../../controllers/api/v1/feeController.js';
const router = Router();
router.get('/payments', getPayments);
router.post('/payments', postPayment);
export default router;