import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { list, show } from '../controllers/teacherController.js';

const router = Router();
router.get('/teachers', requireAuth, list);
router.get('/teachers/:id', requireAuth, show);
export default router;