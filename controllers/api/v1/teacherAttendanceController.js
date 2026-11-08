import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { todayInTimezone } from '../../../config/timezone.js';

export function getTeacherAttendance(req, res) {
  try {
    const date = req.query.date || todayInTimezone();
    const records = db.prepare(`
      SELECT ta.*, u.display_name AS teacher_name, u.username
      FROM teacher_attendance ta 
      JOIN users u ON u.id = ta.user_id
      WHERE ta.date = ? ORDER BY u.display_name
    `).all(date);
    return sendSuccess(res, records, 'Teacher attendance retrieved');
  } catch (err) { return sendError(res, 'Failed to load', 'INTERNAL_ERROR', 500); }
}