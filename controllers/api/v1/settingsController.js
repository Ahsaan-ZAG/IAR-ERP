import { getAllSettings, updateSettings, EDITABLE_KEYS } from '../../../services/settingsService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getSettings(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    return sendSuccess(res, getAllSettings(), 'Settings');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}

export function postSettings(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    const updates = {};
    for (const key of EDITABLE_KEYS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const changed = updateSettings(updates);
    return sendSuccess(res, changed, 'Settings updated');
  } catch (err) { return sendError(res, err.message, 'INTERNAL_ERROR', 500); }
}