import { Router } from 'express';
import { getStudentFee, getPayments } from '../../../controllers/api/v1/feeController.js';

const router = Router();
router.get('/student/:id', getStudentFee);
router.get('/payments', getPayments);

export default router;