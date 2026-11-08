import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getTeachers(req, res) {
  try {
    const teachers = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.last_login_at,
             t.joining_date, t.status AS teacher_status,
             (SELECT COUNT(*) FROM batch_session_teachers bst
              JOIN batch_sessions bs ON bs.id = bst.session_id
              WHERE bst.teacher_user_id = u.id AND bs.status = 'completed') AS completed_sessions
      FROM users u LEFT JOIN teachers t ON t.user_id = u.id
      WHERE u.role = 'teacher' ORDER BY u.display_name
    `).all();
    return sendSuccess(res, teachers, 'Teachers retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load teachers', 'INTERNAL_ERROR', 500);
  }
}

export function getTeacher(req, res) {
  try {
    const teacher = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.last_login_at, u.created_at,
             t.joining_date, t.status AS teacher_status
      FROM users u LEFT JOIN teachers t ON t.user_id = u.id
      WHERE u.id = ? AND u.role = 'teacher'
    `).get(req.params.id);
    if (!teacher) return sendError(res, 'Teacher not found', 'NOT_FOUND', 404);
    
    teacher.attendance = db.prepare('SELECT * FROM teacher_attendance WHERE user_id = ? ORDER BY date DESC LIMIT 30').all(req.params.id);
    return sendSuccess(res, teacher, 'Teacher details retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load teacher', 'INTERNAL_ERROR', 500);
  }
}