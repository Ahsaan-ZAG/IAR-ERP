import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getReportData(req, res) {
  try {
    const { type } = req.params;
    
    if (type === 'students') {
      const data = db.prepare(`SELECT roll_no, name, father_name, status FROM students ORDER BY roll_no`).all();
      return sendSuccess(res, data, 'Student report');
    } 
    else if (type === 'outstanding') {
      const data = db.prepare(`
        SELECT s.roll_no, s.name, 
        COALESCE((SELECT SUM(amount) FROM student_fee_ledger WHERE student_id = s.id), 0) AS balance
        FROM students s WHERE s.status = 'active' HAVING balance > 0 ORDER BY balance DESC
      `).all();
      return sendSuccess(res, data, 'Outstanding report');
    }
    else if (type === 'fee_collection') {
      const data = db.prepare(`
        SELECT p.receipt_no, p.payment_date, s.name, s.roll_no, p.amount, p.method
        FROM payments p JOIN students s ON s.id = p.student_id ORDER BY p.payment_date DESC LIMIT 100
      `).all();
      return sendSuccess(res, data, 'Fee collection report');
    }
    
    return sendError(res, 'Report type not supported', 'BAD_REQUEST', 400);
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}