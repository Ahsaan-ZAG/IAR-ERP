import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getBatches(req, res) {
  try {
    const batches = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM students s WHERE s.current_batch_id = b.id AND s.status = 'active') AS active_students,
        (SELECT COUNT(*) FROM batch_sessions bs WHERE bs.batch_id = b.id AND bs.session_date = date('now')) AS today_sessions
      FROM batches b WHERE b.is_active = 1 ORDER BY b.id
    `).all();
    return sendSuccess(res, batches, 'Batches retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load batches', 'INTERNAL_ERROR', 500);
  }
}

export function getBatch(req, res) {
  try {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    if (!batch) return sendError(res, 'Batch not found', 'NOT_FOUND', 404);
    
    batch.students = db.prepare('SELECT id, roll_no, name, father_name, status FROM students WHERE current_batch_id = ? ORDER BY roll_no').all(batch.id);
    return sendSuccess(res, batch, 'Batch details retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load batch', 'INTERNAL_ERROR', 500);
  }
}