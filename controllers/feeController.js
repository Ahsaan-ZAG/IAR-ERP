import { validationResult } from 'express-validator';
import db from '../config/database.js';
import {
  listStudentsWithBalance, getStudentBalance, getStudentLedger, getStudentMonthlySummary,
  addCharge, addDiscount, addAdjustment, addBulkCharge, getBatchFeeAmount,
} from '../services/feeService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone } from '../config/timezone.js';

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
  
  const currentYear = new Date().getFullYear().toString();
  const monthlySummary = getStudentMonthlySummary(student.id, currentYear);

  res.render('fees/student', {
    title: `Fees — ${student.name}`,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    student, balance, ledger, suggestedAmount,
    monthlySummary, currentYear,
    flash: res.locals.flash,
  });
}

export function showBulkForm(req, res) {
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('fees/bulk', {
    title: 'Bulk Fee Charge',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    batches,
    today: todayInTimezone(),
    formErrors: {},
    formData: { fee_month: todayInTimezone().slice(0, 7) }, // default current month
    flash: res.locals.flash,
  });
}

function fail(req, res, err, redirectPath) {
  req.session.flash = { type: 'error', message: err.message || err };
  res.redirect(redirectPath);
}

export function postCharge(req, res) {
  const path = `/fees/student/${req.params.id}`;
  const v = validationResult(req);
  if (!v.isEmpty()) return fail(req, res, v.array()[0].msg, path);
  try {
    addCharge({ 
      studentId: parseInt(req.params.id, 10), 
      amount: req.body.amount, 
      description: req.body.description, 
      dueDate: req.body.due_date || null, 
      feeMonth: req.body.fee_month || null,
      userId: req.session.user.id 
    });
    audit(req, { action: 'fee_charge_added', module: 'fee', recordId: req.params.id, newValues: req.body });
    req.session.flash = { type: 'success', message: 'Fee charge added.' };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect(path);
}

export function postBulkCharge(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
    return res.status(400).render('fees/bulk', {
      title: 'Bulk Fee Charge', user: res.locals.user, csrfToken: res.locals.csrfToken,
      batches, today: todayInTimezone(), formErrors: { _general: v.array()[0].msg },
      formData: req.body, flash: null,
    });
  }

  const { batch_id, amount, description, due_date, fee_month } = req.body;
  const batchId = batch_id ? parseInt(batch_id, 10) : null;

  try {
    const result = addBulkCharge({
      batchId,
      amount: parseInt(amount, 10),
      description,
      dueDate: due_date || null,
      feeMonth: fee_month,
      userId: req.session.user.id,
    });

    audit(req, { action: 'fee_bulk_charge_added', module: 'fee', newValues: { ...req.body, count: result.count } });
    req.session.flash = { type: 'success', message: `Fee charged successfully to ${result.count} student(s).` };
    res.redirect('/fees');
  } catch (err) {
    const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
    res.status(400).render('fees/bulk', {
      title: 'Bulk Fee Charge', user: res.locals.user, csrfToken: res.locals.csrfToken,
      batches, today: todayInTimezone(), formErrors: { _general: err.message },
      formData: req.body, flash: null,
    });
  }
}

export function postDiscount(req, res) {
  const path = `/fees/student/${req.params.id}`;
  const v = validationResult(req);
  if (!v.isEmpty()) return fail(req, res, v.array()[0].msg, path);
  try {
    addDiscount({ studentId: parseInt(req.params.id, 10), amount: req.body.amount, description: req.body.description, userId: req.session.user.id });
    audit(req, { action: 'fee_discount_added', module: 'fee', recordId: req.params.id, newValues: req.body });
    req.session.flash = { type: 'success', message: 'Discount applied.' };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect(path);
}

export function postAdjustment(req, res) {
  const path = `/fees/student/${req.params.id}`;
  const v = validationResult(req);
  if (!v.isEmpty()) return fail(req, res, v.array()[0].msg, path);
  try {
    addAdjustment({ studentId: parseInt(req.params.id, 10), amount: req.body.amount, direction: req.body.direction, description: req.body.description, userId: req.session.user.id });
    audit(req, { action: 'fee_adjustment_added', module: 'fee', recordId: req.params.id, newValues: req.body });
    req.session.flash = { type: 'success', message: 'Adjustment applied.' };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect(path);
}
