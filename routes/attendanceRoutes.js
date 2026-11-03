import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, markForm, save, viewForDate } from '../controllers/attendanceController.js';

const router = Router();
router.get('/attendance', requireAuth, index);
router.get('/attendance/mark', requireAuth, markForm);
router.post('/attendance/mark', requireAuth, save);
router.get('/attendance/view', requireAuth, viewForDate);
export default router;