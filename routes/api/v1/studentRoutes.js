import { Router } from 'express';
import { getStudents, getStudent, postStudent } from '../../../controllers/api/v1/studentController.js';
const router = Router();
router.get('/', getStudents);
router.get('/:id', getStudent);
router.post('/', postStudent);
export default router;