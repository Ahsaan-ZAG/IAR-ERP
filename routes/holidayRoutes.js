import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, showNew, create, showEdit, update, cancel } from '../controllers/holidayController.js';

const router = Router();
router.get('/holidays', requireAuth, index);
router.get('/holidays/new', requireAuth, showNew);
router.post('/holidays/new', requireAuth, create);
router.get('/holidays/:id/edit', requireAuth, showEdit);
router.post('/holidays/:id/edit', requireAuth, update);
router.post('/holidays/:id/cancel', requireAuth, cancel);
export default router;