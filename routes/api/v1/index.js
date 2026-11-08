import { Router } from 'express';
import { requireApiAuth } from '../../../middleware/apiAuth.js';
import { apiMobileReadOnly } from '../../../middleware/apiMobileReadOnly.js';
import { sendError } from '../../../services/api/responseService.js';

// Import all routes
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import studentRoutes from './studentRoutes.js';
import teacherRoutes from './teacherRoutes.js';
import batchRoutes from './batchRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import feeRoutes from './feeRoutes.js';
import holidayRoutes from './holidayRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reportRoutes from './reportRoutes.js';

const router = Router();

// 1. Public (Login)
router.use('/auth', authRoutes);

// 2. Protection
router.use(requireApiAuth);
router.use(apiMobileReadOnly);

// 3. Protected Modules
router.use('/dashboard', dashboardRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/batches', batchRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/fees', feeRoutes);
router.use('/holidays', holidayRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);

// 4. Fallback
router.use((req, res) => {
  sendError(res, 'API Route not found', 'NOT_FOUND', 404);
});

export default router;