import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getReportData(req, res) {
  try {
    const { type } = req.params; 
    
    if (type === 'students') {
      const data = db.prepare(`SELECT roll_no, name, father_name, status FROM students ORDER BY roll_no`).all();
      return sendSuccess(res, data, 'Student report data');
    } 
    else if (type === 'outstanding') {
      const data = db.prepare(`
        SELECT s.roll_no, s.name, 
        COALESCE((SELECT SUM(amount) FROM student_fee_ledger WHERE student_id = s.id), 0) AS balance
        FROM students s WHERE s.status = 'active'
        HAVING balance > 0 ORDER BY balance DESC
      `).all();
      return sendSuccess(res, data, 'Outstanding report data');
    }
    
    return sendError(res, 'Report type not supported', 'BAD_REQUEST', 400);
  } catch (err) {
    return sendError(res, 'Failed to generate report', 'INTERNAL_ERROR', 500);
  }
}