import db from '../config/database.js';

export function listBatches() {
  return db.prepare(`
    SELECT b.*,
           (SELECT COUNT(*) FROM students s WHERE s.current_batch_id = b.id AND s.status = 'active') AS active_students,
           (SELECT COUNT(*) FROM batch_sessions bs WHERE bs.batch_id = b.id AND bs.session_date = date('now')) AS today_sessions
    FROM batches b
    WHERE b.is_active = 1
    ORDER BY b.id
  `).all();
}

export function getBatchById(id) {
  return db.prepare(`
    SELECT b.*,
           (SELECT COUNT(*) FROM students s WHERE s.current_batch_id = b.id AND s.status = 'active') AS active_students
    FROM batches b WHERE b.id = ?
  `).get(id);
}

export function getBatchStudents(batchId) {
  return db.prepare(`
    SELECT id, roll_no, name, father_name, status
    FROM students
    WHERE current_batch_id = ?
    ORDER BY roll_no
  `).all(batchId);
}

export function getBatchRecentSessions(batchId, limit = 10) {
  return db.prepare(`
    SELECT bs.*, 
      (SELECT GROUP_CONCAT(u.display_name, ', ')
       FROM batch_session_teachers bst
       JOIN users u ON u.id = bst.teacher_user_id
       WHERE bst.session_id = bs.id) AS teachers
    FROM batch_sessions bs
    WHERE bs.batch_id = ?
    ORDER BY bs.session_date DESC, bs.id DESC
    LIMIT ?
  `).all(batchId, limit);
}

export function getBatchCompletionStats(batchId, monthStart) {
  const row = db.prepare(`
    SELECT 
      COUNT(*) AS total_sessions,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) AS missed_sessions
    FROM batch_sessions
    WHERE batch_id = ? AND session_date >= ?
  `).get(batchId, monthStart);
  return {
    total: row.total_sessions || 0,
    completed: row.completed_sessions || 0,
    missed: row.missed_sessions || 0,
    percentage: row.total_sessions ? Math.round((row.completed_sessions / row.total_sessions) * 100) : 0,
  };
}