import db from '../config/database.js';

export function getDayData(date) {
  const payments = db.prepare(`
    SELECT p.*, s.name, s.roll_no, u.display_name AS received_by_name
    FROM payments p
    JOIN students s ON s.id = p.student_id
    LEFT JOIN users u ON u.id = p.received_by
    WHERE p.payment_date = ?
    ORDER BY p.created_at DESC
  `).all(date);

  const expenses = db.prepare(`
    SELECT e.*, u.display_name AS created_by_name
    FROM expenses e LEFT JOIN users u ON u.id = e.created_by
    WHERE e.expense_date = ?
    ORDER BY e.created_at DESC
  `).all(date);

  const totalCollection = payments.filter(p => !p.is_reversed).reduce((s, p) => s + p.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  return { payments, expenses, totalCollection, totalExpense, net: totalCollection - totalExpense };
}

export const addExpense = db.transaction(({ category, amount, date, description, userId }) => {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Amount must be positive integer');
  const info = db.prepare(`
    INSERT INTO expenses (category, amount, expense_date, description, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(category, amount, date, description || null, userId);
  return Number(info.lastInsertRowid);
});

export const closeDay = db.transaction(({ date, userId }) => {
  const { totalCollection, totalExpense, net } = getDayData(date);
  db.prepare(`
    INSERT INTO financial_closings (closing_date, total_collection, total_expense, net_amount, closed_by)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(closing_date) DO UPDATE SET
      total_collection = excluded.total_collection,
      total_expense = excluded.total_expense,
      net_amount = excluded.net_amount,
      closed_by = excluded.closed_by,
      created_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `).run(date, totalCollection, totalExpense, net, userId);
  return { totalCollection, totalExpense, net };
});

export function getClosingRecord(date) {
  return db.prepare(`
    SELECT fc.*, u.display_name AS closed_by_name
    FROM financial_closings fc LEFT JOIN users u ON u.id = fc.closed_by
    WHERE fc.closing_date = ?
  `).get(date);
}

export function getMonthlySummary(year, month) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

  const charges = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS t FROM student_fee_ledger
    WHERE entry_type = 'charge' AND entry_date BETWEEN ? AND ?
  `).get(monthStart, monthEnd).t;
  const discounts = db.prepare(`
    SELECT COALESCE(SUM(-amount), 0) AS t FROM student_fee_ledger
    WHERE entry_type = 'discount' AND entry_date BETWEEN ? AND ?
  `).get(monthStart, monthEnd).t;
  const payments = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS t FROM payments
    WHERE is_reversed = 0 AND payment_date BETWEEN ? AND ?
  `).get(monthStart, monthEnd).t;
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS t FROM expenses
    WHERE expense_date BETWEEN ? AND ?
  `).get(monthStart, monthEnd).t;
  const outstanding = db.prepare('SELECT COALESCE(SUM(amount), 0) AS t FROM student_fee_ledger').get().t;

  return { charges, discounts, payments, expenses, outstanding, net: payments - expenses };
}