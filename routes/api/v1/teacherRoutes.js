import { Router } from 'express';
import { getTeachers, getTeacher } from '../../../controllers/api/v1/teacherController.js';
const router = Router();
router.get('/', getTeachers);
router.get('/:id', getTeacher);
export default router;