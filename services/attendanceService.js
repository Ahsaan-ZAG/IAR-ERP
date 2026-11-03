import db from '../config/database.js';
import { isHolidayForBatch } from './holidayService.js';

export function getStudentsForAttendance(batchId, date) {
  return db.prepare(`
    SELECT s.id, s.roll_no, s.name, s.father_name,
           a.status AS current_status, a.id AS attendance_id
    FROM students s
    LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
    WHERE s.current_batch_id = ? AND s.status = 'active'
    ORDER BY s.roll_no
  `).all(date, batchId);
}

export const saveBatchAttendance = db.transaction(({ batchId, date, entries, userId }) => {
  const holidayInfo = isHolidayForBatch(batchId, date);
  if (holidayInfo) {
    throw new Error(`Cannot mark attendance on holiday: "${holidayInfo.holiday.title}". Use a special working session or cancel the holiday.`);
  }

  const results = [];
  for (const { studentId, status } of entries) {
    const existing = db.prepare('SELECT id, status FROM attendance WHERE student_id = ? AND date = ?').get(studentId, date);
    if (existing) {
      if (existing.status !== status) {
        db.prepare('UPDATE attendance SET status = ?, marked_by = ? WHERE id = ?').run(status, userId, existing.id);
        results.push({ studentId, action: 'updated', oldStatus: existing.status, newStatus: status });
      } else results.push({ studentId, action: 'unchanged' });
    } else {
      db.prepare('INSERT INTO attendance (student_id, batch_id, date, status, marked_by) VALUES (?, ?, ?, ?, ?)')
        .run(studentId, batchId, date, status, userId);
      results.push({ studentId, action: 'created', newStatus: status });
    }
  }
  return results;
});

export function getAttendanceForDate(batchId, date) {
  return db.prepare(`
    SELECT a.*, s.roll_no, s.name, s.father_name, u.display_name AS marked_by_name
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    LEFT JOIN users u ON u.id = a.marked_by
    WHERE a.batch_id = ? AND a.date = ? ORDER BY s.roll_no
  `).all(batchId, date);
}

export function getAttendanceStats(batchId, date) {
  return db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late,
      SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) AS leave_count
    FROM attendance WHERE batch_id = ? AND date = ?
  `).get(batchId, date);
}