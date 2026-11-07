import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, checkIn, checkOut } from '../controllers/teacherAttendanceController.js';

const router = Router();
router.get('/teacher-attendance', requireAuth, index);
router.post('/teacher-attendance/checkin', requireAuth, checkIn);
router.post('/teacher-attendance/checkout', requireAuth, checkOut);
export default router;