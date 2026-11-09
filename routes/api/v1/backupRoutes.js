import { Router } from 'express';
import { getBackups, postCreateBackup, downloadBackup } from '../../../controllers/api/v1/backupController.js';
const router = Router();
router.get('/', getBackups);
router.post('/create', postCreateBackup);
router.get('/download/:filename', downloadBackup);
export default router;