import db from '../config/database.js';
import { todayInTimezone } from '../config/timezone.js';

function sum(query, ...params) {
  const row = db.prepare(query).get(...params);
  return row?.total ?? 0;
}

export function dashboard(req, res) {
  const today = todayInTimezone();
  const monthStart = today.slice(0, 7) + '-01';

  const stats = {
    activeStudents: sum(`SELECT COUNT(*) AS total FROM students WHERE status = 'active'`),
    inactiveStudents: sum(`SELECT COUNT(*) AS total FROM students WHERE status = 'inactive'`),
    presentToday: sum(`SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND status = 'present'`, today),
    absentToday: sum(`SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND status = 'absent'`, today),
    lateToday: sum(`SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND status = 'late'`, today),
    feeToday: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_date = ? AND is_reversed = 0`, today),
    feeMonth: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_date >= ? AND is_reversed = 0`, monthStart),
    outstanding: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM student_fee_ledger`),
    expenseMonth: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE expense_date >= ?`, monthStart),
  };

  const holidayRows = db.prepare(`
    SELECT DISTINCT COALESCE(hb.batch_id, b.id) AS batch_id
    FROM holidays h
    LEFT JOIN holiday_batches hb ON hb.holiday_id = h.id
    LEFT JOIN batches b ON b.is_active = 1
    WHERE h.is_cancelled = 0
      AND ? BETWEEN h.start_date AND h.end_date
      AND COALESCE(hb.is_special_working, 0) = 0
  `).all(today);
  stats.holidayBatchesToday = holidayRows.filter(r => r.batch_id !== null).length;

  const recentActivity = db.prepare(`
    SELECT al.action, al.module, al.created_at, u.display_name AS user_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC LIMIT 10
  `).all();

  const notifications = db.prepare(`
    SELECT id, type, message, is_read, created_at
    FROM notifications
    WHERE user_id IS NULL OR user_id = ?
    ORDER BY created_at DESC LIMIT 5
  `).all(req.session.user.id);

  res.render('dashboard/index', {
    title: 'Dashboard | Imam Ahmed Raza Academy',
    csrfToken: res.locals.csrfToken,
    user: req.session.user,
    accessMode: req.session.access_mode,
    stats, recentActivity, notifications, today,
  });
}