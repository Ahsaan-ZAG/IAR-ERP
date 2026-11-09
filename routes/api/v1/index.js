import { Router } from 'express';
import { requireApiAuth } from '../../../middleware/apiAuth.js';
import { apiMobileReadOnly } from '../../../middleware/apiMobileReadOnly.js';
import { sendError } from '../../../services/api/responseService.js';

// Saare routes import karein
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import studentRoutes from './studentRoutes.js';
import teacherRoutes from './teacherRoutes.js';
import batchRoutes from './batchRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import feeRoutes from './feeRoutes.js';
import holidayRoutes from './holidayRoutes.js';
import monthlyFeeRoutes from './monthlyFeeRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import teacherAttendanceRoutes from './teacherAttendanceRoutes.js';
import batchSessionRoutes from './batchSessionRoutes.js';
import financialRoutes from './financialRoutes.js';
// Phase 9 Naye Routes
import reportRoutes from './reportRoutes.js';
import searchRoutes from './searchRoutes.js';
import aiRoutes from './aiRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import userRoutes from './userRoutes.js';
import auditRoutes from './auditRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import backupRoutes from './backupRoutes.js';

const router = Router();

// 1. Public Route
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
router.use('/monthly-fees', monthlyFeeRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/teacher-attendance', teacherAttendanceRoutes);
router.use('/batch-sessions', batchSessionRoutes);
router.use('/financial', financialRoutes);
// Naye APIs
router.use('/reports', reportRoutes);
router.use('/search', searchRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/settings', settingsRoutes);
router.use('/backups', backupRoutes);

// 4. Fallback
router.use((req, res) => sendError(res, 'API Route not found', 'NOT_FOUND', 404));

export default router;