import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, showNew, create, show, saveResults } from '../controllers/academicController.js';
import { assessmentRules } from '../validators/academicValidators.js';

const router = Router();
router.get('/exams', requireAuth, index);
router.get('/exams/new', requireAuth, showNew);
router.post('/exams/new', requireAuth, assessmentRules, create);
router.get('/exams/:id', requireAuth, show);
router.post('/exams/:id/results', requireAuth, saveResults);
export default router;