import db from '../config/database.js';
import { todayInTimezone } from '../config/timezone.js';
import { listStudents, getStudentById } from '../services/studentService.js';
import { getStudentBalance, getStudentLedger, listStudentsWithBalance } from '../services/feeService.js';
import { listPayments } from '../services/paymentService.js';
import { getStudentsForAttendance, getAttendanceForDate } from '../services/attendanceService.js';
import { listSessions } from '../services/batchSessionService.js';
import { listHolidays } from '../services/holidayService.js';
import { listNotifications } from '../services/notificationService.js';
import { REPORT_LIST } from '../services/reportService.js';
import { ALLOWED_CHARTS } from '../services/analyticsService.js';

function sum(query, ...params) {
  return db.prepare(query).get(...params)?.total ?? 0;
}

export function dashboard(req, res) {
  const today = todayInTimezone();
  const monthStart = today.slice(0, 7) + '-01';

  const stats = {
    activeStudents: sum(`SELECT COUNT(*) AS total FROM students WHERE status = 'active'`),
    presentToday: sum(`SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND status = 'present'`, today),
    absentToday: sum(`SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND status = 'absent'`, today),
    feeMonth: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_date >= ? AND is_reversed = 0`, monthStart),
    outstanding: sum(`SELECT COALESCE(SUM(amount),0) AS total FROM student_fee_ledger`),
  };

  const recentNotifications = listNotifications(req.session.user.id, 3);

  res.render('mobile/dashboard', {
    title: 'Dashboard — Imam Ahmed Raza Academy',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    today, stats, recentNotifications,
  });
}

export function students(req, res) {
  const search = (req.query.search || '').trim();
  const page = parseInt(req.query.page, 10) || 1;
  const result = listStudents({ search, batchId: null, status: 'active', page, pageSize: 20 });
  res.render('mobile/students', {
    title: 'Students',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    students: result.rows,
    filters: { search },
    pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
  });
}

export function studentShow(req, res) {
  const student = getStudentById(req.params.id);
  if (!student) return res.status(404).render('errors/404', { title: 'Not Found' });
  res.render('mobile/student-show', {
    title: student.name,
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    student,
    balance: getStudentBalance(student.id),
    ledger: getStudentLedger(student.id, 15),
  });
}

export function teachers(req, res) {
  const teachers = db.prepare(`
    SELECT u.id, u.display_name, u.username, u.is_active, u.last_login_at,
      (SELECT COUNT(*) FROM batch_session_teachers bst
       JOIN batch_sessions bs ON bs.id = bst.session_id
       WHERE bst.teacher_user_id = u.id AND bs.status = 'completed') AS completed_sessions
    FROM users u WHERE u.role = 'teacher'
    ORDER BY u.display_name
  `).all();
  res.render('mobile/teachers', {
    title: 'Teachers',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    teachers,
  });
}

export function batches(req, res) {
  const batches = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM students s WHERE s.current_batch_id = b.id AND s.status = 'active') AS active_students
    FROM batches b WHERE b.is_active = 1 ORDER BY b.id
  `).all();
  res.render('mobile/batches', {
    title: 'Batches',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    batches,
  });
}

export function batchShow(req, res) {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
  if (!batch) return res.status(404).render('errors/404', { title: 'Not Found' });
  const students = db.prepare(`
    SELECT id, roll_no, name, father_name FROM students
    WHERE current_batch_id = ? AND status = 'active' ORDER BY roll_no
  `).all(batch.id);
  const sessions = listSessions({ batchId: batch.id, limit: 10 });
  res.render('mobile/batch-show', {
    title: batch.name,
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    batch, students, sessions,
  });
}

export function attendance(req, res) {
  const today = todayInTimezone();
  const date = req.query.date || today;
  const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();

  let records = [];
  let selectedBatch = null;
  if (batchId) {
    selectedBatch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
    records = getAttendanceForDate(batchId, date);
  }

  res.render('mobile/attendance', {
    title: 'Attendance',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    batches, date, batchId, selectedBatch, records,
  });
}

export function fees(req, res) {
  const search = (req.query.search || '').trim();
  const page = parseInt(req.query.page, 10) || 1;
  const result = listStudentsWithBalance({ search, batchId: null, onlyDefaulters: false, page, pageSize: 25 });
  res.render('mobile/fees', {
    title: 'Fees',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    students: result.rows,
    filters: { search },
    pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
  });
}

export function feeStudent(req, res) {
  const student = getStudentById(req.params.id);
  if (!student) return res.status(404).render('errors/404', { title: 'Not Found' });
  res.render('mobile/fee-student', {
    title: `Fees — ${student.name}`,
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    student,
    balance: getStudentBalance(student.id),
    ledger: getStudentLedger(student.id, 30),
  });
}

export function payments(req, res) {
  const search = (req.query.search || '').trim();
  const page = parseInt(req.query.page, 10) || 1;
  const result = listPayments({ search, fromDate: '', toDate: '', page, pageSize: 25 });
  res.render('mobile/payments', {
    title: 'Payments',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    payments: result.rows,
    filters: { search },
    pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
  });
}

export function holidays(req, res) {
  const holidays = listHolidays({ fromDate: null, toDate: null, includeCancelled: false });
  res.render('mobile/holidays', {
    title: 'Holidays',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    holidays,
  });
}

export function sessions(req, res) {
  const date = req.query.date || todayInTimezone();
  const sessions = listSessions({ batchId: null, date, status: '', limit: 50 });
  res.render('mobile/sessions', {
    title: 'Batch Sessions',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    sessions, date,
  });
}

export function notifications(req, res) {
  const list = listNotifications(req.session.user.id, 50);
  res.render('mobile/notifications', {
    title: 'Notifications',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    notifications: list,
  });
}

export function reports(req, res) {
  const today = todayInTimezone();
  const monthStart = today.slice(0, 7) + '-01';
  res.render('mobile/reports', {
    title: 'Reports',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    reports: REPORT_LIST, today, monthStart,
  });
}

export function analytics(req, res) {
  res.render('mobile/analytics', {
    title: 'Analytics',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
    charts: ALLOWED_CHARTS,
  });
}

export function more(req, res) {
  res.render('mobile/more', {
    title: 'More',
    user: req.session.user,
    csrfToken: res.locals.csrfToken,
    currentPath: req.path,
  });
}