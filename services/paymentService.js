import db from '../config/database.js';
import { todayInTimezone } from '../config/timezone.js';

export function generateReceiptNo() {
  const year = new Date().getFullYear().toString();
  const storedYear = db.prepare("SELECT value FROM settings WHERE key = 'receipt_year'").get()?.value;
  let counter = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'receipt_counter'").get()?.value || '0', 10);
  if (storedYear !== year) {
    counter = 0;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('receipt_year', ?)").run(year);
  }
  counter += 1;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('receipt_counter', ?)").run(String(counter));
  return `RCPT-${year}-${String(counter).padStart(4, '0')}`;
}

export const createPayment = db.transaction(({ studentId, amount, method, notes, feeMonth, userId }) => {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Amount must be a positive integer');
  if (!['cash', 'bank', 'easypaisa', 'jazzcash', 'cheque'].includes(method)) throw new Error('Invalid payment method');

  const receiptNo = generateReceiptNo();
  const paymentDate = todayInTimezone();

  const payInfo = db.prepare(`
    INSERT INTO payments (student_id, receipt_no, amount, payment_date, method, received_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(studentId, receiptNo, amount, paymentDate, method, userId, notes || null);
  const paymentId = Number(payInfo.lastInsertRowid);

  const ledInfo = db.prepare(`
    INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, reference_id, entry_date, fee_month, created_by)
    VALUES (?, 'payment', ?, ?, ?, ?, ?, ?)
  `).run(studentId, -amount, `Payment via ${method} — Receipt ${receiptNo}`, paymentId, paymentDate, feeMonth || null, userId);

  db.prepare('UPDATE payments SET ledger_id = ? WHERE id = ?').run(Number(ledInfo.lastInsertRowid), paymentId);

  return { paymentId, receiptNo, paymentDate };
});

export const reversePayment = db.transaction(({ paymentId, reason, userId }) => {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  if (!p) throw new Error('Payment not found');
  if (p.is_reversed) throw new Error('Payment already reversed');
  db.prepare('UPDATE payments SET is_reversed = 1 WHERE id = ?').run(paymentId);
  db.prepare('INSERT INTO payment_reversals (payment_id, reason, reversed_by) VALUES (?, ?, ?)').run(paymentId, reason, userId);
  db.prepare(`
    INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, reference_id, entry_date, created_by)
    VALUES (?, 'reversal', ?, ?, ?, ?, ?)
  `).run(p.student_id, p.amount, `Reversal of ${p.receipt_no}: ${reason}`, paymentId, todayInTimezone(), userId);
  return p;
});

export function getPaymentById(id) {
  return db.prepare(`
    SELECT p.*, s.name, s.roll_no, s.father_name, u.display_name AS received_by_name,
           r.reason AS reversal_reason, r.reversed_at, ru.display_name AS reversed_by_name
    FROM payments p
    JOIN students s ON s.id = p.student_id
    LEFT JOIN users u ON u.id = p.received_by
    LEFT JOIN payment_reversals r ON r.payment_id = p.id
    LEFT JOIN users ru ON ru.id = r.reversed_by
    WHERE p.id = ?
  `).get(id);
}

export function listPayments({ search, fromDate, toDate, page = 1, pageSize = 30 }) {
  const cond = []; const params = [];
  if (search) {
    cond.push('(s.name LIKE ? OR s.roll_no LIKE ? OR p.receipt_no LIKE ?)');
    const t = `%${search}%`; params.push(t, t, t);
  }
  if (fromDate) { cond.push('p.payment_date >= ?'); params.push(fromDate); }
  if (toDate) { cond.push('p.payment_date <= ?'); params.push(toDate); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM payments p JOIN students s ON s.id = p.student_id ${where}`).get(...params).c;
  const offset = (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT p.*, s.name, s.roll_no, u.display_name AS received_by_name
    FROM payments p
    JOIN students s ON s.id = p.student_id
    LEFT JOIN users u ON u.id = p.received_by
    ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
