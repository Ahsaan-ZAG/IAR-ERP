import { Router } from 'express';
import { getTeacherAttendance } from '../../../controllers/api/v1/teacherAttendanceController.js';
const router = Router();
router.get('/', getTeacherAttendance);
export default router;