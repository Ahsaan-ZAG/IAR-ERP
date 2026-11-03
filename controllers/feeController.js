import { validationResult } from 'express-validator';
import db from '../config/database.js';
import {
  listStudentsWithBalance, getStudentBalance, getStudentLedger,
  addCharge, addDiscount, addAdjustment, getBatchFeeAmount,
} from '../services/feeService.js';
import { audit } from '../services/auditService.js';

export function index(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const search = (req.query.search || '').trim();
  const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
  const onlyDefaulters = req.query.defaulters === '1';

  const result = listStudentsWithBalance({ search, batchId, onlyDefaulters, page });
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();

  res.render('fees/index', {
    title: 'Fee Management',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    students: result.rows,
    batches,
    filters: { search, batchId, onlyDefaulters },
    pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
    flash: res.locals.flash,
  });
}

export function showStudent(req, res) {
  const student = db.prepare(`
    SELECT s.*, b.name AS batch_name FROM students s
    LEFT JOIN batches b ON b.id = s.current_batch_id WHERE s.id = ?
  `).get(req.params.id);
  if (!student) return res.status(404).render('errors/404', { title: 'Not Found' });

  const balance = getStudentBalance(student.id);
  const ledger = getStudentLedger(student.id);
  const suggestedAmount = getBatchFeeAmount(student.current_batch_id) || '';

  res.render('fees/student', {
    title: `Fees — ${student.name}`,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    student, balance, ledger, suggestedAmount,
    flash: res.locals.flash,
  });
}

function handleError(req, res, redirectPath, err) {
  console.error('Fee operation failed:', err.message);
  req.session.flash = { type: 'error', message: err.message };
  res.redirect(redirectPath);
}

export function postCharge(req, res) {
  const errors = validationResult(req);
  const redirectPath = `/fees/student/${req.params.id}`;
  if (!errors.isEmpty()) {
    req.session.flash = { type: 'error', message: errors.array()[0].msg };
    return res.redirect(redirectPath);
  }
  try {
    addCharge({ studentId: parseInt(req.params.id, 10), amount: req.body.amount, description: req.body.description, dueDate: req.body.due_date || null, userId: req.session.user.id });
    audit(req, { action: 'fee_charge_added', module: 'fee', recordId: req.params.id, newValues: { amount: req.body.amount, description: req.body.description } });
    req.session.flash = { type: 'success', message: 'Fee charge added.' };
    res.redirect(redirectPath);
  } catch (err) { handleError(req, res, redirectPath, err); }
}

export function postDiscount(req, res) {
  const errors = validationResult(req);
  const redirectPath = `/fees/student/${req.params.id}`;
  if (!errors.isEmpty()) {
    req.session.flash = { type: 'error', message: errors.array()[0].msg };
    return res.redirect(redirectPath);
  }
  try {
    addDiscount({ studentId: parseInt(req.params.id, 10), amount: req.body.amount, description: req.body.description, userId: req.session.user.id });
    audit(req, { action: 'fee_discount_added', module: 'fee', recordId: req.params.id, newValues: { amount: req.body.amount, description: req.body.description } });
    req.session.flash = { type: 'success', message: 'Discount applied.' };
    res.redirect(redirectPath);
  } catch (err) { handleError(req, res, redirectPath, err); }
}

export function postAdjustment(req, res) {
  const errors = validationResult(req);
  const redirectPath = `/fees/student/${req.params.id}`;
  if (!errors.isEmpty()) {
    req.session.flash = { type: 'error', message: errors.array()[0].msg };
    return res.redirect(redirectPath);
  }
  try {
    addAdjustment({ studentId: parseInt(req.params.id, 10), amount: req.body.amount, direction: req.body.direction, description: req.body.description, userId: req.session.user.id });
    audit(req, { action: 'fee_adjustment_added', module: 'fee', recordId: req.params.id, newValues: { direction: req.body.direction, amount: req.body.amount, description: req.body.description } });
    req.session.flash = { type: 'success', message: 'Adjustment applied.' };
    res.redirect(redirectPath);
  } catch (err) { handleError(req, res, redirectPath, err); }
}