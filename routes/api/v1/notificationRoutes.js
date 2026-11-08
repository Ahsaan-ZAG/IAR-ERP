import { Router } from 'express';
import { getNotifications } from '../../../controllers/api/v1/notificationController.js';
const router = Router();
router.get('/', getNotifications);
export default router;