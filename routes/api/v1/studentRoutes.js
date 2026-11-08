import { Router } from 'express';
import { getStudents, getStudent } from '../../../controllers/api/v1/studentController.js';

const router = Router();
router.get('/', getStudents);
router.get('/:id', getStudent);

export default router;