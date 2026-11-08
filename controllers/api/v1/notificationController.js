import { listNotifications } from '../../../services/notificationService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getNotifications(req, res) {
  try {
    const list = listNotifications(req.apiUser.id, 50);
    return sendSuccess(res, list, 'Notifications retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load notifications', 'INTERNAL_ERROR', 500);
  }
}