import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index } from '../controllers/searchController.js';
const router = Router();
router.get('/search', requireAuth, index);
export default router;