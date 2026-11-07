import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { index, postCreate, postRestore, download, postUpload } from '../controllers/backupController.js'; // <-- postUpload import
import { uploadBackup } from '../config/multer.js'; // <-- Multer import

const router = Router();
router.get('/backups', requireAuth, requireAdmin, index);
router.post('/backups/create', requireAuth, requireAdmin, postCreate);
router.post('/backups/restore', requireAuth, requireAdmin, postRestore);
router.get('/backups/download/:filename', requireAuth, requireAdmin, download);

// Naya Route (upload)
router.post('/backups/upload', requireAuth, requireAdmin, uploadBackup.single('backupFile'), postUpload);

export default router;