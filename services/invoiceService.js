import db from '../config/database.js';
import { todayInTimezone } from '../config/timezone.js';

export function generateInvoiceNo() {
  const year = new Date().getFullYear().toString();
  const storedYear = db.prepare("SELECT value FROM settings WHERE key = 'invoice_year'").get()?.value;
  let counter = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'invoice_counter'").get()?.value || '0', 10);
  
  if (storedYear !== year) {
    counter = 0;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('invoice_year', ?)").run(year);
  }
  counter += 1;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('invoice_counter', ?)").run(String(counter));
  return `INV-${year}-${String(counter).padStart(4, '0')}`;
}

export const createInvoice = db.transaction(({ studentId, feeMonth, customFeeAmount, userId }) => {
  // 1. Check if already exists
  const existing = db.prepare('SELECT id FROM invoices WHERE student_id = ? AND fee_month = ?').get(studentId, feeMonth);
  if (existing) throw new Error(`Invoice for ${feeMonth} already exists for this student.`);

  // 2. Check if a charge exists for this month. If not, add it automatically.
  const chargeExists = db.prepare("SELECT id FROM student_fee_ledger WHERE student_id = ? AND fee_month = ? AND entry_type = 'charge'").get(studentId, feeMonth);
  
  if (!chargeExists) {
    const defaultFee = customFeeAmount ? parseInt(customFeeAmount, 10) : 200; // Default 200
    db.prepare(`
      INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, fee_month, entry_date, created_by)
      VALUES (?, 'charge', ?, 'Monthly Fee', ?, ?, ?)
    `).run(studentId, defaultFee, feeMonth, todayInTimezone(), userId);
  }

  // 3. Get ledger data for this month (Now it will definitely have a charge)
  const ledger = db.prepare(`
    SELECT 
      SUM(CASE WHEN entry_type = 'charge' THEN amount ELSE 0 END) AS charged,
      SUM(CASE WHEN entry_type IN ('payment', 'discount', 'reversal') THEN amount ELSE 0 END) AS paid
    FROM student_fee_ledger
    WHERE student_id = ? AND fee_month = ?
  `).get(studentId, feeMonth);

  const balance = ledger.charged + ledger.paid;
  let status = 'unpaid';
  if (balance <= 0) status = 'paid';
  else if (Math.abs(ledger.paid) > 0) status = 'partial';

  const invoiceNo = generateInvoiceNo();

  const info = db.prepare(`
    INSERT INTO invoices (invoice_no, student_id, fee_month, total_charged, total_paid, balance, status, generated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(invoiceNo, studentId, feeMonth, ledger.charged, Math.abs(ledger.paid), balance, status, userId);

  return Number(info.lastInsertRowid);
});

export function getInvoiceById(id) {
  const invoice = db.prepare(`
    SELECT i.*, s.name AS student_name, s.roll_no, s.father_name, b.name AS batch_name, u.display_name AS generated_by_name
    FROM invoices i
    JOIN students s ON s.id = i.student_id
    LEFT JOIN batches b ON b.id = s.current_batch_id
    LEFT JOIN users u ON u.id = i.generated_by
    WHERE i.id = ?
  `).get(id);
  
  if (!invoice) return null;

  invoice.transactions = db.prepare(`
    SELECT * FROM student_fee_ledger
    WHERE student_id = ? AND fee_month = ?
    ORDER BY entry_date, id
  `).all(invoice.student_id, invoice.fee_month);

  return invoice;
}

export function listInvoices({ month, status, search, page = 1, pageSize = 30 }) {
  const cond = [];
  const params = [];
  if (month) { cond.push('i.fee_month = ?'); params.push(month); }
  if (status) { cond.push('i.status = ?'); params.push(status); }
  if (search) {
    cond.push('(s.name LIKE ? OR s.roll_no LIKE ? OR i.invoice_no LIKE ?)');
    const t = `%${search}%`; params.push(t, t, t);
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM invoices i JOIN students s ON s.id = i.student_id ${where}`).get(...params).c;
  const offset = (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT i.*, s.name AS student_name, s.roll_no
    FROM invoices i
    JOIN students s ON s.id = i.student_id
    ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
