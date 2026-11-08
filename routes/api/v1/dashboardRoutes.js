import { Router } from 'express';
import { getDashboardStats } from '../../../controllers/api/v1/dashboardController.js';

const router = Router();
router.get('/', getDashboardStats);
export default router;
