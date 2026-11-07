import db from '../config/database.js';
import { getTeacherAttendanceHistory } from '../services/teacherAttendanceService.js';

export function list(req, res) {
  const teachers = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.last_login_at,
           t.joining_date, t.status AS teacher_status,
           (SELECT COUNT(*) FROM batch_session_teachers bst
            JOIN batch_sessions bs ON bs.id = bst.session_id
            WHERE bst.teacher_user_id = u.id AND bs.status = 'completed') AS completed_sessions
    FROM users u
    LEFT JOIN teachers t ON t.user_id = u.id
    WHERE u.role = 'teacher'
    ORDER BY u.display_name
  `).all();

  res.render('teachers/index', {
    title: 'Teachers',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    teachers,
    flash: res.locals.flash,
  });
}

export function show(req, res) {
  const teacher = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.last_login_at, u.created_at,
           t.joining_date, t.status AS teacher_status
    FROM users u
    LEFT JOIN teachers t ON t.user_id = u.id
    WHERE u.id = ? AND u.role = 'teacher'
  `).get(req.params.id);

  if (!teacher) return res.status(404).render('errors/404', { title: 'Teacher Not Found' });

  const attendance = getTeacherAttendanceHistory(teacher.id, 30);
  const sessions = db.prepare(`
    SELECT bs.*, b.name AS batch_name
    FROM batch_session_teachers bst
    JOIN batch_sessions bs ON bs.id = bst.session_id
    JOIN batches b ON b.id = bs.batch_id
    WHERE bst.teacher_user_id = ?
    ORDER BY bs.session_date DESC
    LIMIT 20
  `).all(teacher.id);

  res.render('teachers/show', {
    title: teacher.display_name,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    teacher,
    attendance,
    sessions,
    flash: res.locals.flash,
  });
}