import { validationResult } from 'express-validator';
import db from '../config/database.js';
import { listAssignments, getAssignmentById, getAssignmentStudentRows, createAssignment, saveAssignmentStatus } from '../services/assignmentService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone } from '../config/timezone.js';

export function index(req, res) {
  const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
  const assignments = listAssignments({ batchId });
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('assignments/index', {
    title: 'Homework & Assignments', user: res.locals.user, csrfToken: res.locals.csrfToken,
    assignments, batches, filters: { batchId }, flash: res.locals.flash,
  });
}

export function showNew(req, res) {
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('assignments/new', {
    title: 'New Assignment', user: res.locals.user, csrfToken: res.locals.csrfToken,
    batches, today: todayInTimezone(), formErrors: {}, formData: {}, flash: res.locals.flash,
  });
}

export function create(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
    return res.status(400).render('assignments/new', {
      title: 'New Assignment', user: res.locals.user, csrfToken: res.locals.csrfToken,
      batches, today: todayInTimezone(), formErrors: { _general: v.array()[0].msg },
      formData: req.body, flash: null,
    });
  }
  try {
    const id = createAssignment({
      title: req.body.title, description: req.body.description, batchId: req.body.batch_id,
      assignedDate: req.body.assigned_date, dueDate: req.body.due_date || null,
      userId: req.session.user.id,
    });
    audit(req, { action: 'assignment_created', module: 'assignment', recordId: id, newValues: req.body });
    req.session.flash = { type: 'success', message: 'Assignment created.' };
    res.redirect(`/assignments/${id}`);
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect('/assignments/new');
  }
}

export function show(req, res) {
  const a = getAssignmentById(req.params.id);
  if (!a) return res.status(404).render('errors/404', { title: 'Not Found' });
  const rows = getAssignmentStudentRows(a.id);
  res.render('assignments/show', {
    title: a.title, user: res.locals.user, csrfToken: res.locals.csrfToken,
    assignment: a, rows, flash: res.locals.flash,
  });
}

export function saveStatuses(req, res) {
  const assignmentId = parseInt(req.params.id, 10);
  const entries = [];
  for (const key of Object.keys(req.body)) {
    if (key.startsWith('status_')) {
      const studentId = parseInt(key.replace('status_', ''), 10);
      entries.push({
        studentId,
        status: req.body[key],
        remarks: req.body['remarks_' + studentId] || '',
      });
    }
  }
  try {
    saveAssignmentStatus({ assignmentId, entries });
    audit(req, { action: 'assignment_status_saved', module: 'assignment', recordId: assignmentId, newValues: { count: entries.length } });
    req.session.flash = { type: 'success', message: 'Statuses saved.' };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect(`/assignments/${assignmentId}`);
}