import db from '../config/database.js';
import { todayInTimezone } from '../config/timezone.js';

export function getStudentBalance(studentId) {
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM student_fee_ledger WHERE student_id = ?').get(studentId).balance;
}

export function getStudentMonthlySummary(studentId, year) {
  const rows = db.prepare(`
    SELECT fee_month,
           SUM(CASE WHEN entry_type = 'charge' THEN amount ELSE 0 END) AS charged,
           SUM(CASE WHEN entry_type IN ('payment', 'discount', 'reversal') THEN amount ELSE 0 END) AS paid
    FROM student_fee_ledger
    WHERE student_id = ? AND fee_month LIKE ?
    GROUP BY fee_month
  `).all(studentId, `${year}-%`);

  const summary = {};
  for (let i = 1; i <= 12; i++) {
    const m = i.toString().padStart(2, '0');
    const key = `${year}-${m}`;
    const record = rows.find(r => r.fee_month === key) || { charged: 0, paid: 0 };
    summary[key] = {
      charged: record.charged,
      paid: Math.abs(record.paid),
      balance: record.charged + record.paid
    };
  }
  return summary;
}

export function getStudentLedger(studentId, limit = 200) {
  const rows = db.prepare(`
    SELECT l.*, u.display_name AS created_by_name
    FROM student_fee_ledger l LEFT JOIN users u ON u.id = l.created_by
    WHERE l.student_id = ? ORDER BY l.created_at DESC, l.id DESC LIMIT ?
  `).all(studentId, limit);
  const oldestFirst = [...rows].reverse();
  let running = 0;
  oldestFirst.forEach(r => { running += r.amount; r.running_balance = running; });
  return oldestFirst.reverse();
}

export const addCharge = db.transaction(({ studentId, amount, description, dueDate, feeMonth, userId }) => {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Amount must be a positive integer');
  const info = db.prepare(`
    INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, due_date, entry_date, fee_month, created_by)
    VALUES (?, 'charge', ?, ?, ?, ?, ?, ?)
  `).run(studentId, amount, description, dueDate || null, todayInTimezone(), feeMonth || null, userId);
  return Number(info.lastInsertRowid);
});

export const addBulkCharge = db.transaction(({ batchId, amount, description, dueDate, feeMonth, userId }) => {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Amount must be a positive integer');
  if (!feeMonth) throw new Error('Fee Month is required for bulk charge.');
  
  let query = "SELECT id FROM students WHERE status = 'active'";
  const params = [];
  if (batchId) {
    query += " AND current_batch_id = ?";
    params.push(batchId);
  }
  
  const students = db.prepare(query).all(...params);
  if (students.length === 0) throw new Error('No active students found for this selection.');

  const insertStmt = db.prepare(`
    INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, due_date, entry_date, fee_month, created_by)
    VALUES (?, 'charge', ?, ?, ?, ?, ?, ?)
  `);

  const today = todayInTimezone();

  for (const s of students) {
    insertStmt.run(s.id, amount, description, dueDate || null, today, feeMonth, userId);
  }

  return { count: students.length };
});

export const addDiscount = db.transaction(({ studentId, amount, description, userId }) => {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Amount must be a positive integer');
  const info = db.prepare(`
    INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, entry_date, created_by)
    VALUES (?, 'discount', ?, ?, ?, ?)
  `).run(studentId, -amount, description, todayInTimezone(), userId);
  return Number(info.lastInsertRowid);
});

export const addAdjustment = db.transaction(({ studentId, amount, direction, description, userId }) => {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Amount must be a positive integer');
  const signed = direction === 'subtract' ? -amount : amount;
  const info = db.prepare(`
    INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, entry_date, created_by)
    VALUES (?, 'adjustment', ?, ?, ?, ?)
  `).run(studentId, signed, description, todayInTimezone(), userId);
  return Number(info.lastInsertRowid);
});

export function listStudentsWithBalance({ search, batchId, onlyDefaulters, page = 1, pageSize = 20 }) {
  const cond = ["s.status = 'active'"];
  const params = [];
  if (search) {
    cond.push('(s.name LIKE ? OR s.father_name LIKE ? OR s.roll_no LIKE ?)');
    const t = `%${search}%`; params.push(t, t, t);
  }
  if (batchId) { cond.push('s.current_batch_id = ?'); params.push(batchId); }
  const where = `WHERE ${cond.join(' AND ')}`;
  const outer = onlyDefaulters ? 'WHERE balance > 0' : '';
  const order = onlyDefaulters ? 'ORDER BY balance DESC' : 'ORDER BY roll_no';

  const total = db.prepare(`
    SELECT COUNT(*) AS c FROM (
      SELECT s.id, COALESCE((SELECT SUM(amount) FROM student_fee_ledger WHERE student_id = s.id), 0) AS balance
      FROM students s ${where}
    ) ${outer}
  `).get(...params).c;

  const offset = (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT * FROM (
      SELECT s.id, s.roll_no, s.name, s.father_name, b.name AS batch_name,
        COALESCE((SELECT SUM(amount) FROM student_fee_ledger WHERE student_id = s.id), 0) AS balance
      FROM students s LEFT JOIN batches b ON b.id = s.current_batch_id ${where}
    ) ${outer} ${order} LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function getBatchFeeAmount(batchId) {
  return db.prepare("SELECT amount FROM fee_structures WHERE batch_id = ? ORDER BY created_at DESC LIMIT 1").get(batchId)?.amount || null;
}
