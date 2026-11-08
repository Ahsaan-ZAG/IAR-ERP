import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { todayInTimezone } from '../../../config/timezone.js';

export function getAttendance(req, res) {
  try {
    const date = req.query.date || todayInTimezone();
    const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
    
    let query = `SELECT a.*, s.roll_no, s.name, s.father_name, b.name AS batch_name 
                 FROM attendance a JOIN students s ON s.id = a.student_id JOIN batches b ON b.id = a.batch_id WHERE a.date = ?`;
    const params = [date];
    
    if (batchId) { query += ` AND a.batch_id = ?`; params.push(batchId); }
    
    const records = db.prepare(query).all(...params);
    return sendSuccess(res, records, 'Attendance retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load attendance', 'INTERNAL_ERROR', 500);
  }
}

export function getStudentAttendance(req, res) {
  try {
    const records = db.prepare(`
      SELECT a.*, b.name AS batch_name FROM attendance a 
      LEFT JOIN batches b ON b.id = a.batch_id 
      WHERE a.student_id = ? ORDER BY a.date DESC LIMIT 50
    `).all(req.params.id);
    return sendSuccess(res, records, 'Student attendance retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load attendance', 'INTERNAL_ERROR', 500);
  }
}