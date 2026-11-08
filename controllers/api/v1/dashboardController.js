import db from '../../../config/database.js';
import { todayInTimezone } from '../../../config/timezone.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

function sum(query, ...params) {
  return db.prepare(query).get(...params)?.total ?? 0;
}

export function getDashboardStats(req, res) {
  try {
    const today = todayInTimezone();
    const monthStart = today.slice(0, 7) + '-01';

    const stats = {
      activeStudents: sum(`SELECT COUNT(*) AS total FROM students WHERE status = 'active'`),
      presentToday: sum(`SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND status = 'present'`, today),
      absentToday: sum(`SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND status = 'absent'`, today),
      feeMonth: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_date >= ? AND is_reversed = 0`, monthStart),
      outstanding: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM student_fee_ledger`),
      expensesMonth: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE expense_date >= ?`, monthStart),
    };

    const recentActivity = db.prepare(`
      SELECT al.action, al.module, al.created_at, u.display_name AS user_name
      FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT 5
    `).all();

    return sendSuccess(res, { stats, recentActivity }, 'Dashboard data retrieved');
  } catch (err) {
    console.error('API Dashboard Error:', err);
    return sendError(res, 'Failed to load dashboard', 'INTERNAL_ERROR', 500);
  }
}
