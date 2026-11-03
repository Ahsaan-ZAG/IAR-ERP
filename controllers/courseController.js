import { validationResult } from 'express-validator';
import db from '../config/database.js';
import { listCourses, getCourseById, createCourse, addTopic, toggleTopic } from '../services/courseService.js';
import { audit } from '../services/auditService.js';

export function index(req, res) {
  const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
  const courses = listCourses({ batchId });
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('courses/index', {
    title: 'Courses & Syllabus', user: res.locals.user, csrfToken: res.locals.csrfToken,
    courses, batches, filters: { batchId }, flash: res.locals.flash,
  });
}

export function showNew(req, res) {
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('courses/new', {
    title: 'New Course', user: res.locals.user, csrfToken: res.locals.csrfToken,
    batches, formErrors: {}, formData: {}, flash: res.locals.flash,
  });
}

export function create(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
    return res.status(400).render('courses/new', {
      title: 'New Course', user: res.locals.user, csrfToken: res.locals.csrfToken,
      batches, formErrors: { _general: v.array()[0].msg }, formData: req.body, flash: null,
    });
  }
  try {
    const id = createCourse({ title: req.body.title, batchId: req.body.batch_id || null, description: req.body.description });
    audit(req, { action: 'course_created', module: 'course', recordId: id, newValues: req.body });
    req.session.flash = { type: 'success', message: 'Course created. Add topics next.' };
    res.redirect(`/courses/${id}`);
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect('/courses/new');
  }
}

export function show(req, res) {
  const course = getCourseById(req.params.id);
  if (!course) return res.status(404).render('errors/404', { title: 'Not Found' });
  res.render('courses/show', {
    title: course.title, user: res.locals.user, csrfToken: res.locals.csrfToken,
    course, flash: res.locals.flash,
  });
}

export function postAddTopic(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    req.session.flash = { type: 'error', message: v.array()[0].msg };
    return res.redirect(`/courses/${req.params.id}`);
  }
  try {
    addTopic({ courseId: parseInt(req.params.id, 10), topic: req.body.topic });
    audit(req, { action: 'topic_added', module: 'course', recordId: req.params.id, newValues: { topic: req.body.topic } });
    req.session.flash = { type: 'success', message: 'Topic added.' };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect(`/courses/${req.params.id}`);
}

export function postToggleTopic(req, res) {
  try {
    const courseId = toggleTopic({ topicId: parseInt(req.params.topicId, 10) });
    audit(req, { action: 'topic_toggled', module: 'course', recordId: courseId });
    req.session.flash = { type: 'success', message: 'Topic updated.' };
    res.redirect(`/courses/${courseId}`);
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect('/courses');
  }
}