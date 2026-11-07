import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, showNew, create, show, postAddTopic, postToggleTopic } from '../controllers/courseController.js';
import { courseRules, topicRules } from '../validators/academicValidators.js';

const router = Router();
router.get('/courses', requireAuth, index);
router.get('/courses/new', requireAuth, showNew);
router.post('/courses/new', requireAuth, courseRules, create);
router.get('/courses/:id', requireAuth, show);
router.post('/courses/:id/topics', requireAuth, topicRules, postAddTopic);
router.post('/courses/:id/topics/:topicId/toggle', requireAuth, postToggleTopic);
export default router;