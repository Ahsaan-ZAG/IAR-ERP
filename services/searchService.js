import db from '../config/database.js';

export function globalSearch(q, userRole) {
  if (!q || q.trim().length < 2) return { students: [], teachers: [], payments: [], expenses: [], batches: [] };
  const term = `%${q.trim()}%`;

  const students = db.prepare(`
    SELECT s.id, s.roll_no, s.name, s.father_name, b.name AS batch_name
    FROM students s LEFT JOIN batches b ON b.id = s.current_batch_id
    WHERE s.name LIKE ? OR s.father_name LIKE ? OR s.roll_no LIKE ?
    ORDER BY s.name LIMIT 20
  `).all(term, term, term);

  const payments = db.prepare(`
    SELECT p.id, p.receipt_no, p.amount, p.payment_date, s.name AS student_name
    FROM payments p JOIN students s ON s.id = p.student_id
    WHERE p.receipt_no LIKE ?
    ORDER BY p.payment_date DESC LIMIT 15
  `).all(term);

  const batches = db.prepare('SELECT id, name, start_time, end_time FROM batches WHERE name LIKE ? LIMIT 10').all(term);

  const teachers = userRole === 'admin' ? db.prepare(`
    SELECT id, username, display_name FROM users
    WHERE role = 'teacher' AND (display_name LIKE ? OR username LIKE ?) LIMIT 10
  `).all(term, term) : [];

  const expenses = db.prepare(`
    SELECT id, category, amount, expense_date, description FROM expenses
    WHERE category LIKE ? OR description LIKE ?
    ORDER BY expense_date DESC LIMIT 15
  `).all(term, term);

  return { students, teachers, payments, expenses, batches };
}