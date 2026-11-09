import { listNotifications, markRead, markAllRead } from '../../../services/notificationService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getNotifications(req, res) {
  try {
    const list = listNotifications(req.apiUser.id, 50);
    return sendSuccess(res, list, 'Notifications');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}

export function readNotification(req, res) {
  try {
    markRead(parseInt(req.params.id, 10), req.apiUser.id);
    return sendSuccess(res, null, 'Marked as read');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}

export function readAllNotifications(req, res) {
  try {
    markAllRead(req.apiUser.id);
    return sendSuccess(res, null, 'All marked as read');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}