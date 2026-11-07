import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { editStudentRules } from '../validators/studentValidator.js';
import { list, show, showEdit, update } from '../controllers/studentController.js';

const router = Router();

router.get('/students', requireAuth, list);
router.get('/students/:id', requireAuth, show);
router.get('/students/:id/edit', requireAuth, showEdit);
router.post('/students/:id', requireAuth, editStudentRules, update);

export default router;