import db from '../config/database.js';
import { getStudentsForAttendance, saveBatchAttendance, getAttendanceForDate, getAttendanceStats } from '../services/attendanceService.js';
import { isHolidayForBatch } from '../services/holidayService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone } from '../config/timezone.js';

const VALID = ['present', 'absent', 'late', 'leave', 'holiday'];

export function index(req, res) {
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('attendance/index', {
    title: 'Attendance',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    batches,
    today: todayInTimezone(),
    flash: res.locals.flash,
  });
}

export function markForm(req, res) {
  const batchId = parseInt(req.query.batch, 10);
  const date = req.query.date || todayInTimezone();
  if (!batchId) return res.redirect('/attendance');
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
  if (!batch) return res.status(404).render('errors/404', { title: 'Not Found' });

  const holidayInfo = isHolidayForBatch(batchId, date);
  const students = holidayInfo ? [] : getStudentsForAttendance(batchId, date);
  const stats = getAttendanceStats(batchId, date);

  res.render('attendance/mark', {
    title: `Mark — ${batch.name}`,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    batch, date, students, stats,
    statuses: VALID,
    holidayInfo,
    flash: res.locals.flash,
  });
}

export function save(req, res) {
  const batchId = parseInt(req.body.batch_id, 10);
  const date = req.body.date;
  if (!batchId || !date) return res.redirect('/attendance');

  const entries = [];
  for (const key of Object.keys(req.body)) {
    if (key.startsWith('status_')) {
      const studentId = parseInt(key.replace('status_', ''), 10);
      if (VALID.includes(req.body[key])) entries.push({ studentId, status: req.body[key] });
    }
  }

  if (!entries.length) {
    req.session.flash = { type: 'error', message: 'No entries submitted.' };
    return res.redirect(`/attendance/mark?batch=${batchId}&date=${date}`);
  }

  try {
    const results = saveBatchAttendance({ batchId, date, entries, userId: req.session.user.id });
    audit(req, { action: 'attendance_saved', module: 'attendance', recordId: batchId, newValues: { date, count: results.length } });
    const created = results.filter(r => r.action === 'created').length;
    const updated = results.filter(r => r.action === 'updated').length;
    req.session.flash = { type: 'success', message: `Saved. Created: ${created}, Updated: ${updated}.` };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect(`/attendance/mark?batch=${batchId}&date=${date}`);
}

export function viewForDate(req, res) {
  const batchId = parseInt(req.query.batch, 10);
  const date = req.query.date || todayInTimezone();
  if (!batchId) return res.redirect('/attendance');
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
  if (!batch) return res.status(404).render('errors/404', { title: 'Not Found' });
  const records = getAttendanceForDate(batchId, date);
  const stats = getAttendanceStats(batchId, date);
  res.render('attendance/view', {
    title: `Attendance — ${batch.name}`,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    batch, date, records, stats,
    flash: res.locals.flash,
  });
}