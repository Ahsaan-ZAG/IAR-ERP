import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, showNew, create, show, saveStatuses } from '../controllers/assignmentController.js';
import { assignmentRules } from '../validators/academicValidators.js';

const router = Router();
router.get('/assignments', requireAuth, index);
router.get('/assignments/new', requireAuth, showNew);
router.post('/assignments/new', requireAuth, assignmentRules, create);
router.get('/assignments/:id', requireAuth, show);
router.post('/assignments/:id/status', requireAuth, saveStatuses);
export default router;