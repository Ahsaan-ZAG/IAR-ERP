import { Router } from 'express';
import { getAttendance, postAttendance } from '../../../controllers/api/v1/attendanceController.js';
const router = Router();
router.get('/', getAttendance);
router.post('/', postAttendance);
export default router;