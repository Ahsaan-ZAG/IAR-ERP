import db from '../config/database.js';
import { getTeacherAttendanceForDate, checkInTeacher, checkOutTeacher } from '../services/teacherAttendanceService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone, nowTimeInTimezone } from '../config/timezone.js'; 

export function index(req, res) {
  const date = req.query.date || todayInTimezone();
  const records = getTeacherAttendanceForDate(date);
  const isAdmin = req.session.user.role === 'admin';
  const myRecord = isAdmin ? null
    : db.prepare('SELECT * FROM teacher_attendance WHERE user_id = ? AND date = ?').get(req.session.user.id, date);

  res.render('teacher-attendance/index', {
    title: 'Teacher Attendance', user: res.locals.user, csrfToken: res.locals.csrfToken,
    date, records, myRecord, isAdmin, flash: res.locals.flash,
  });
}

export function checkIn(req, res) {
  if (req.session.user.role !== 'teacher') {
    req.session.flash = { type: 'error', message: 'Admin has view-only access.' };
    return res.redirect('/teacher-attendance');
  }
  const today = todayInTimezone();
  const now = nowTimeInTimezone(); 

  try {
    checkInTeacher({ userId: req.session.user.id, date: today, time: now });
    audit(req, { action: 'teacher_checkin', module: 'teacher_attendance', newValues: { date: today, check_in: now } });
    req.session.flash = { type: 'success', message: `Checked in at ${now}.` };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect('/teacher-attendance');
}

export function checkOut(req, res) {
  if (req.session.user.role !== 'teacher') {
    req.session.flash = { type: 'error', message: 'Admin has view-only access.' };
    return res.redirect('/teacher-attendance');
  }
  const today = todayInTimezone();
  const now = nowTimeInTimezone(); 

  try {
    checkOutTeacher({ userId: req.session.user.id, date: today, time: now });
    audit(req, { action: 'teacher_checkout', module: 'teacher_attendance', newValues: { date: today, check_out: now } });
    req.session.flash = { type: 'success', message: `Checked out at ${now}.` };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect('/teacher-attendance');
}
