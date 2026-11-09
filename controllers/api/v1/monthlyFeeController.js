import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { todayInTimezone } from '../../../config/timezone.js';

export function getMonthlyFees(req, res) {
  try {
    const month = req.query.month || todayInTimezone().slice(0, 7);
    
    const students = db.prepare(`
      SELECT s.id, s.roll_no, s.name, s.father_name, b.name AS batch_name,
             COALESCE(SUM(CASE WHEN l.entry_type = 'charge' THEN l.amount ELSE 0 END), 0) AS total_charged,
             COALESCE(SUM(CASE WHEN l.entry_type IN ('payment', 'discount') THEN l.amount ELSE 0 END), 0) AS total_paid
      FROM students s
      LEFT JOIN batches b ON b.id = s.current_batch_id
      LEFT JOIN student_fee_ledger l ON l.student_id = s.id AND l.fee_month = ?
      WHERE s.status = 'active'
      GROUP BY s.id
      ORDER BY s.roll_no
    `).all(month);

    const feeRecords = students.map(s => {
      const charged = s.total_charged === 0 ? 200 : s.total_charged;
      const paid = Math.abs(s.total_paid);
      const balance = charged - paid;
      let status = 'unpaid';
      if (balance <= 0) status = 'paid';
      else if (paid > 0) status = 'partial';
      
      return { 
        ...s, 
        display_charged: charged, 
        display_paid: paid, 
        display_balance: balance, 
        status 
      };
    });

    return sendSuccess(res, feeRecords, 'Monthly fees retrieved');
  } catch (err) {
    console.error('Monthly fees error:', err);
    return sendError(res, 'Failed to load monthly fees', 'INTERNAL_ERROR', 500);
  }
}