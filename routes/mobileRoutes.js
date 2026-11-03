import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  dashboard, students, studentShow, teachers, batches, batchShow,
  attendance, fees, feeStudent, payments, holidays, sessions,
  notifications, reports, analytics, more,
} from '../controllers/mobileController.js';

const router = Router();

// All mobile routes are GET-only read-only views.
// Write attempts are blocked by global mobileReadOnly middleware
// when session.access_mode === 'mobile_readonly'.

router.use('/mobile', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

router.get('/mobile/dashboard', requireAuth, dashboard);
router.get('/mobile/students', requireAuth, students);
router.get('/mobile/students/:id', requireAuth, studentShow);
router.get('/mobile/teachers', requireAuth, teachers);
router.get('/mobile/batches', requireAuth, batches);
router.get('/mobile/batches/:id', requireAuth, batchShow);
router.get('/mobile/attendance', requireAuth, attendance);
router.get('/mobile/fees', requireAuth, fees);
router.get('/mobile/fees/student/:id', requireAuth, feeStudent);
router.get('/mobile/payments', requireAuth, payments);
router.get('/mobile/holidays', requireAuth, holidays);
router.get('/mobile/sessions', requireAuth, sessions);
router.get('/mobile/notifications', requireAuth, notifications);
router.get('/mobile/reports', requireAuth, reports);
router.get('/mobile/analytics', requireAuth, analytics);
router.get('/mobile/more', requireAuth, more);

export default router;