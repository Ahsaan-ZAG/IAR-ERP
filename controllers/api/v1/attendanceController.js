import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { saveBatchAttendance } from '../../../services/attendanceService.js';
import { todayInTimezone } from '../../../config/timezone.js';

export function getAttendance(req, res) {
  try {
    const date = req.query.date || todayInTimezone();
    const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
    let query = `SELECT a.*, s.roll_no, s.name, b.name AS batch_name FROM attendance a JOIN students s ON s.id = a.student_id JOIN batches b ON b.id = a.batch_id WHERE a.date = ?`;
    const params = [date];
    if (batchId) { query += ` AND a.batch_id = ?`; params.push(batchId); }
    return sendSuccess(res, db.prepare(query).all(...params), 'Attendance retrieved');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}

export function postAttendance(req, res) {
  try {
    const { batch_id, date, entries } = req.body;
    if (!batch_id || !date || !entries) return sendError(res, 'Missing data', 'VALIDATION_ERROR', 422);
    
    const results = saveBatchAttendance({ batchId: batch_id, date, entries, userId: req.apiUser.id });
    return sendSuccess(res, results, 'Attendance saved');
  } catch (err) { return sendError(res, err.message, 'INTERNAL_ERROR', 500); }
}