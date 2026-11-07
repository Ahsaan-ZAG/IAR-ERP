import db from '../config/database.js';
import { isHolidayForBatch } from './holidayService.js';

export function listSessions({ batchId, date, status, limit = 50 }) {
  const cond = [], params = [];
  if (batchId) { cond.push('bs.batch_id = ?'); params.push(batchId); }
  if (date) { cond.push('bs.session_date = ?'); params.push(date); }
  if (status) { cond.push('bs.status = ?'); params.push(status); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  return db.prepare(`
    SELECT bs.*, b.name AS batch_name,
      (SELECT GROUP_CONCAT(u.display_name, ', ')
       FROM batch_session_teachers bst JOIN users u ON u.id = bst.teacher_user_id
       WHERE bst.session_id = bs.id) AS teachers
    FROM batch_sessions bs JOIN batches b ON b.id = bs.batch_id
    ${where} ORDER BY bs.session_date DESC, bs.scheduled_start DESC LIMIT ?
  `).all(...params, limit);
}

export function getSessionById(id) {
  return db.prepare(`SELECT bs.*, b.name AS batch_name FROM batch_sessions bs
    JOIN batches b ON b.id = bs.batch_id WHERE bs.id = ?`).get(id);
}

export function getSessionTeachers(sessionId) {
  return db.prepare(`SELECT bst.*, u.display_name, u.role FROM batch_session_teachers bst
    JOIN users u ON u.id = bst.teacher_user_id WHERE bst.session_id = ?`).all(sessionId);
}

export const generateDailySessions = db.transaction((date) => {
  const batches = db.prepare('SELECT * FROM batches WHERE is_active = 1').all();
  const ins = db.prepare(`INSERT OR IGNORE INTO batch_sessions
    (batch_id, session_date, scheduled_start, scheduled_end, status)
    VALUES (?, ?, ?, ?, ?)`);
  for (const b of batches) {
    const holidayInfo = isHolidayForBatch(b.id, date);
    const status = holidayInfo ? 'holiday' : 'scheduled';
    ins.run(b.id, date, b.start_time, b.end_time, status);
  }
  return batches.length;
});

export const startSession = db.transaction(({ sessionId, userId, time }) => {
  const s = db.prepare('SELECT * FROM batch_sessions WHERE id = ?').get(sessionId);
  if (!s) throw new Error('Session not found');
  if (s.status === 'completed') throw new Error('Already completed.');
  if (s.status === 'holiday') throw new Error('Cannot start a holiday session.');
  db.prepare(`UPDATE batch_sessions SET status = 'in_progress',
    actual_start = COALESCE(actual_start, ?) WHERE id = ?`).run(time, sessionId);
  db.prepare('INSERT OR IGNORE INTO batch_session_teachers (session_id, teacher_user_id) VALUES (?, ?)')
    .run(sessionId, userId);
});

export const completeSession = db.transaction(({ sessionId, userId, time, topic, remarks }) => {
  const s = db.prepare('SELECT * FROM batch_sessions WHERE id = ?').get(sessionId);
  if (!s) throw new Error('Session not found');
  if (s.status === 'completed') throw new Error('Already completed.');
  if (s.status === 'holiday') throw new Error('Cannot complete a holiday session.');
  db.prepare(`UPDATE batch_sessions SET status = 'completed',
    completed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    actual_start = COALESCE(actual_start, ?),
    topic_covered = COALESCE(?, topic_covered),
    remarks = COALESCE(?, remarks) WHERE id = ?`).run(time, topic || null, remarks || null, sessionId);
  db.prepare(`INSERT OR IGNORE INTO batch_session_teachers
    (session_id, teacher_user_id, confirmed_at)
    VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`).run(sessionId, userId);
});