import { Router } from 'express';
import { getNotifications, readNotification, readAllNotifications } from '../../../controllers/api/v1/notificationController.js';
const router = Router();
router.get('/', getNotifications);
router.post('/:id/read', readNotification);
router.post('/read-all', readAllNotifications);
export default router;