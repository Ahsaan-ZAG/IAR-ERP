import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { index, postCreate, postRestore, download } from '../controllers/backupController.js';

const router = Router();
router.get('/backups', requireAuth, requireAdmin, index);
router.post('/backups/create', requireAuth, requireAdmin, postCreate);
router.post('/backups/restore', requireAuth, requireAdmin, postRestore);
router.get('/backups/download/:filename', requireAuth, requireAdmin, download);
export default router;