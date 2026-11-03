import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, downloadPDF, downloadCSV } from '../controllers/reportController.js';

const router = Router();
router.get('/reports', requireAuth, index);
router.get('/reports/pdf/:key', requireAuth, downloadPDF);
router.get('/reports/csv/:key', requireAuth, downloadCSV);
export default router;