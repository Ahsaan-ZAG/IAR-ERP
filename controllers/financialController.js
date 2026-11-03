import { validationResult } from 'express-validator';
import { getDayData, addExpense, closeDay, getClosingRecord, getMonthlySummary } from '../services/financialService.js';
import { audit } from '../services/auditService.js';
import { notifyAdmins } from '../services/notificationService.js';
import { todayInTimezone } from '../config/timezone.js';

const EXPENSE_CATEGORIES = ['rent', 'salary', 'utilities', 'maintenance', 'supplies', 'other'];

export function index(req, res) {
  const date = req.query.date || todayInTimezone();
  const data = getDayData(date);
  const closing = getClosingRecord(date);
  const now = new Date();
  const year = parseInt(req.query.year || now.getFullYear(), 10);
  const month = parseInt(req.query.month || now.getMonth() + 1, 10);
  const summary = getMonthlySummary(year, month);

  res.render('financial/index', {
    title: 'Financial',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    date, data, closing, summary,
    year, month,
    categories: EXPENSE_CATEGORIES,
    isAdmin: req.session.user.role === 'admin',
    flash: res.locals.flash,
  });
}

export function postExpense(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    req.session.flash = { type: 'error', message: v.array()[0].msg };
    return res.redirect(`/financial?date=${req.body.expense_date || ''}`);
  }
  try {
    const id = addExpense({
      category: req.body.category,
      amount: req.body.amount,
      date: req.body.expense_date,
      description: req.body.description,
      userId: req.session.user.id,
    });
    audit(req, { action: 'expense_added', module: 'expense', recordId: id, newValues: req.body });
    notifyAdmins({
      type: 'expense',
      message: `Expense: ${req.body.category} PKR ${req.body.amount}`,
      referenceType: 'expense',
      referenceId: id,
    });
    req.session.flash = { type: 'success', message: 'Expense added.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect(`/financial?date=${req.body.expense_date || ''}`);
}

export function postClose(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect(`/financial?date=${req.body.date || ''}`);
  }
  try {
    const r = closeDay({ date: req.body.date, userId: req.session.user.id });
    audit(req, {
      action: 'day_closed', module: 'financial',
      newValues: { date: req.body.date, ...r },
    });
    req.session.flash = {
      type: 'success',
      message: `Day closed: +${r.totalCollection} / -${r.totalExpense} / net ${r.net}`,
    };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect(`/financial?date=${req.body.date || ''}`);
}