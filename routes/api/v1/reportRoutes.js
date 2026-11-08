import { Router } from 'express';
import { getReportData } from '../../../controllers/api/v1/reportController.js';
const router = Router();
router.get('/:type', getReportData);
export default router;