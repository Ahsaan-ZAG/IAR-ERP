import { validationResult } from 'express-validator';
import db from '../config/database.js';
import {
  listAssessments, getAssessmentById, getAssessmentEntryRows,
  createAssessment, saveAssessmentResults,
} from '../services/academicService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone } from '../config/timezone.js';

export function index(req, res) {
  const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
  const type = req.query.type || '';
  const assessments = listAssessments({ batchId, type });
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('academics/index', {
    title: 'Exams & Results', user: res.locals.user, csrfToken: res.locals.csrfToken,
    assessments, batches, filters: { batchId, type }, flash: res.locals.flash,
  });
}

export function showNew(req, res) {
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('academics/new', {
    title: 'New Exam', user: res.locals.user, csrfToken: res.locals.csrfToken,
    batches, today: todayInTimezone(), formErrors: {}, formData: {}, flash: res.locals.flash,
  });
}

export function create(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
    return res.status(400).render('academics/new', {
      title: 'New Exam', user: res.locals.user, csrfToken: res.locals.csrfToken,
      batches, today: todayInTimezone(), formErrors: { _general: v.array()[0].msg },
      formData: req.body, flash: null,
    });
  }
  try {
    const id = createAssessment({
      title: req.body.title, batchId: req.body.batch_id, type: req.body.type,
      examDate: req.body.exam_date, maxMarks: req.body.max_marks, description: req.body.description,
      userId: req.session.user.id,
    });
    audit(req, { action: 'assessment_created', module: 'assessment', recordId: id, newValues: req.body });
    req.session.flash = { type: 'success', message: 'Exam created. Enter results now.' };
    res.redirect(`/exams/${id}`);
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect('/exams/new');
  }
}

export function show(req, res) {
  const a = getAssessmentById(req.params.id);
  if (!a) return res.status(404).render('errors/404', { title: 'Not Found' });
  const rows = getAssessmentEntryRows(a);
  res.render('academics/show', {
    title: a.title, user: res.locals.user, csrfToken: res.locals.csrfToken,
    assessment: a, rows, flash: res.locals.flash,
  });
}

export function saveResults(req, res) {
  const assessmentId = parseInt(req.params.id, 10);
  const entries = [];
  for (const key of Object.keys(req.body)) {
    if (key.startsWith('marks_')) {
      const studentId = parseInt(key.replace('marks_', ''), 10);
      const obtainedMarks = req.body[key];
      const remarks = req.body['remarks_' + studentId] || '';
      entries.push({ studentId, obtainedMarks, remarks });
    }
  }
  try {
    saveAssessmentResults({ assessmentId, entries, userId: req.session.user.id });
    audit(req, { action: 'assessment_results_saved', module: 'assessment', recordId: assessmentId, newValues: { count: entries.length } });
    req.session.flash = { type: 'success', message: 'Results saved.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect(`/exams/${assessmentId}`);
}