import { Router } from 'express';
import { getAttendance, getStudentAttendance } from '../../../controllers/api/v1/attendanceController.js';
const router = Router();
router.get('/', getAttendance);
router.get('/student/:id', getStudentAttendance);
export default router;