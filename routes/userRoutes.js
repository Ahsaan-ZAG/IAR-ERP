import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { index, showNew, create, show, update, postResetPassword } from '../controllers/userController.js';
import { createUserRules, updateUserRules, resetPasswordRules } from '../validators/userValidators.js';

const router = Router();
router.get('/users', requireAuth, requireAdmin, index);
router.get('/users/new', requireAuth, requireAdmin, showNew);
router.post('/users/new', requireAuth, requireAdmin, createUserRules, create);
router.get('/users/:id', requireAuth, requireAdmin, show);
router.post('/users/:id', requireAuth, requireAdmin, updateUserRules, update);
router.post('/users/:id/reset-password', requireAuth, requireAdmin, resetPasswordRules, postResetPassword);
export default router;