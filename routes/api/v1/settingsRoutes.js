import { Router } from 'express';
import { getSettings, postSettings } from '../../../controllers/api/v1/settingsController.js';
const router = Router();
router.get('/', getSettings);
router.post('/', postSettings);
export default router;