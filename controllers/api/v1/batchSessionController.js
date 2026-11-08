import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { todayInTimezone } from '../../../config/timezone.js';

export function getSessions(req, res) {
  try {
    const date = req.query.date || todayInTimezone();
    const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
    
    let query = `
      SELECT bs.*, b.name AS batch_name,
        (SELECT GROUP_CONCAT(u.display_name, ', ')
         FROM batch_session_teachers bst JOIN users u ON u.id = bst.teacher_user_id
         WHERE bst.session_id = bs.id) AS teachers
      FROM batch_sessions bs 
      JOIN batches b ON b.id = bs.batch_id
      WHERE bs.session_date = ?
    `;
    const params = [date];
    
    if (batchId) { query += ` AND bs.batch_id = ?`; params.push(batchId); }
    query += ` ORDER BY b.id`;
    
    const sessions = db.prepare(query).all(...params);
    return sendSuccess(res, sessions, 'Batch sessions retrieved');
  } catch (err) { return sendError(res, 'Failed to load', 'INTERNAL_ERROR', 500); }
}