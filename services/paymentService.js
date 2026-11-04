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
// ... baqi reversePayment aur listPayments waise hi rahenge ...
