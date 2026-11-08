import { Router } from 'express';
import { requireApiAuth } from '../../../middleware/apiAuth.js';
import { apiMobileReadOnly } from '../../../middleware/apiMobileReadOnly.js';
import { sendError } from '../../../services/api/responseService.js';

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
import monthlyFeeRoutes from './monthlyFeeRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import teacherAttendanceRoutes from './teacherAttendanceRoutes.js'; // Naya
import batchSessionRoutes from './batchSessionRoutes.js'; // Naya
import financialRoutes from './financialRoutes.js'; // Naya

const router = Router();

router.use('/auth', authRoutes);
router.use(requireApiAuth);
router.use(apiMobileReadOnly);

router.use('/dashboard', dashboardRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/batches', batchRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/fees', feeRoutes);
router.use('/holidays', holidayRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/monthly-fees', monthlyFeeRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/teacher-attendance', teacherAttendanceRoutes); // Naya
router.use('/batch-sessions', batchSessionRoutes); // Naya
router.use('/financial', financialRoutes); // Naya

router.use((req, res) => sendError(res, 'API Route not found', 'NOT_FOUND', 404));
export default router;