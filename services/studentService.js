import db from '../config/database.js';
import { generateRollNumberInternal } from './rollNumberService.js';
import { todayInTimezone } from '../config/timezone.js';

/**
 * Student create karta hai. Transaction-safe — roll number generation
 * aur insert dono ek atomic transaction mein.
 */
export const createStudent = db.transaction(({ name, fatherName }) => {
  const rollNo = generateRollNumberInternal();
  const admissionDate = todayInTimezone();

  const info = db.prepare(`
    INSERT INTO students (roll_no, name, father_name, admission_date)
    VALUES (?, ?, ?, ?)
  `).run(rollNo, name.trim(), fatherName.trim(), admissionDate);

  return { studentId: Number(info.lastInsertRowid), rollNo, admissionDate };
});

/**
 * Student update. Batch change par history record karta hai.
 */
export const updateStudent = db.transaction(
  ({ studentId, name, fatherName, batchId, status, userId }) => {
    const current = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!current) throw new Error('Student not found');

    const oldBatchId = current.current_batch_id || null;
    const newBatchId = batchId || null;
    const batchChanged = oldBatchId !== newBatchId;

    db.prepare(`
      UPDATE students
      SET name = ?, father_name = ?, current_batch_id = ?, status = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ?
    `).run(name.trim(), fatherName.trim(), newBatchId, status, studentId);

    if (batchChanged) {
      db.prepare(`
        INSERT INTO student_batch_history
          (student_id, from_batch_id, to_batch_id, changed_by, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        studentId,
        oldBatchId,
        newBatchId,
        userId,
        oldBatchId ? 'Batch reassigned' : 'Initial batch assignment'
      );
    }

    return { batchChanged, oldBatchId, newBatchId, oldStatus: current.status };
  }
);

export function getStudentById(id) {
  return db.prepare(`
    SELECT s.*, b.name AS batch_name
    FROM students s
    LEFT JOIN batches b ON b.id = s.current_batch_id
    WHERE s.id = ?
  `).get(id);
}

export function getStudentBatchHistory(studentId) {
  return db.prepare(`
    SELECT h.*, fb.name AS from_batch_name, tb.name AS to_batch_name,
           u.display_name AS changed_by_name
    FROM student_batch_history h
    LEFT JOIN batches fb ON fb.id = h.from_batch_id
    LEFT JOIN batches tb ON tb.id = h.to_batch_id
    LEFT JOIN users u ON u.id = h.changed_by
    WHERE h.student_id = ?
    ORDER BY h.changed_at DESC
  `).all(studentId);
}

export function getStudentAuditTimeline(studentId, limit = 30) {
  return db.prepare(`
    SELECT al.*, u.display_name AS user_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.module = 'student' AND al.record_id = ?
    ORDER BY al.created_at DESC
    LIMIT ?
  `).all(studentId, limit);
}

export function listStudents({ search, batchId, status, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(s.name LIKE ? OR s.father_name LIKE ? OR s.roll_no LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (batchId) {
    conditions.push('s.current_batch_id = ?');
    params.push(batchId);
  }
  if (status) {
    conditions.push('s.status = ?');
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM students s ${where}`).get(...params).c;
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(`
    SELECT s.*, b.name AS batch_name
    FROM students s
    LEFT JOIN batches b ON b.id = s.current_batch_id
    ${where}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}