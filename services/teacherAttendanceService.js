import db from '../config/database.js';

export function getTeacherAttendanceForDate(date) {
  return db.prepare(`
    SELECT ta.*, u.display_name AS teacher_name, u.role
    FROM teacher_attendance ta
    JOIN users u ON u.id = ta.user_id
    WHERE ta.date = ?
    ORDER BY u.display_name
  `).all(date);
}

export function getTeacherAttendanceHistory(userId, limit = 30) {
  return db.prepare(`
    SELECT * FROM teacher_attendance
    WHERE user_id = ?
    ORDER BY date DESC LIMIT ?
  `).all(userId, limit);
}

export const checkInTeacher = db.transaction(({ userId, date, time }) => {
  const existing = db
    .prepare('SELECT * FROM teacher_attendance WHERE user_id = ? AND date = ?')
    .get(userId, date);

  if (existing && existing.check_in) {
    throw new Error('Already checked in today.');
  }

  if (existing) {
    db.prepare('UPDATE teacher_attendance SET check_in = ?, marked_by = ? WHERE id = ?')
      .run(time, userId, existing.id);
    return existing.id;
  }

  const info = db.prepare(`
    INSERT INTO teacher_attendance (user_id, date, check_in, status, marked_by)
    VALUES (?, ?, ?, 'present', ?)
  `).run(userId, date, time, userId);
  return Number(info.lastInsertRowid);
});

export const checkOutTeacher = db.transaction(({ userId, date, time }) => {
  const existing = db
    .prepare('SELECT * FROM teacher_attendance WHERE user_id = ? AND date = ?')
    .get(userId, date);

  if (!existing || !existing.check_in) {
    throw new Error('You must check in before checking out.');
  }
  if (existing.check_out) {
    throw new Error('Already checked out today.');
  }

  db.prepare('UPDATE teacher_attendance SET check_out = ? WHERE id = ?')
    .run(time, existing.id);
  return existing.id;
});