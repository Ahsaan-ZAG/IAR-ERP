import db from '../config/database.js';
import { listHolidays, getHolidayById, createHoliday, updateHoliday, cancelHoliday } from '../services/holidayService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone } from '../config/timezone.js';

export function index(req, res) {
  const includeCancelled = req.query.include_cancelled === '1';
  const holidays = listHolidays({
    fromDate: req.query.from || null,
    toDate: req.query.to || null,
    includeCancelled,
  });
  res.render('holidays/index', {
    title: 'Holiday Calendar',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    holidays,
    filters: { from: req.query.from || '', to: req.query.to || '', includeCancelled },
    isAdmin: req.session.user.role === 'admin',
    flash: res.locals.flash,
  });
}

export function showNew(req, res) {
  const batches = db.prepare('SELECT id, name, start_time, end_time FROM batches WHERE is_active = 1 ORDER BY id').all();
  res.render('holidays/new', {
    title: 'New Holiday',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    batches,
    today: todayInTimezone(),
    formErrors: {},
    formData: { title: '', reason: '', start_date: todayInTimezone(), end_date: todayInTimezone(), is_full_day: true, partial_start: '', partial_end: '', batches: [] },
    flash: res.locals.flash,
  });
}

export function create(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect('/holidays');
  }

  const { title, reason, start_date, end_date, is_full_day, partial_start, partial_end } = req.body;
  const isFullDay = is_full_day === '1' || is_full_day === 'on';
  let batchIds = req.body.batch_ids || [];
  if (typeof batchIds === 'string') batchIds = [batchIds];
  if (req.body.all_batches === 'on' || req.body.all_batches === '1') batchIds = ['all'];

  try {
    const holidayId = createHoliday({
      title: (title || '').trim(),
      reason: (reason || '').trim(),
      startDate: start_date,
      endDate: end_date,
      isFullDay,
      partialStart: isFullDay ? null : partial_start,
      partialEnd: isFullDay ? null : partial_end,
      batchIds,
      userId: req.session.user.id,
    });

    audit(req, {
      action: 'holiday_created', module: 'holiday', recordId: holidayId,
      newValues: { title, start_date, end_date, is_full_day: isFullDay, batchIds },
    });

    req.session.flash = { type: 'success', message: `Holiday "${title}" created.` };
    res.redirect('/holidays');
  } catch (err) {
    const batches = db.prepare('SELECT id, name, start_time, end_time FROM batches WHERE is_active = 1 ORDER BY id').all();
    res.status(400).render('holidays/new', {
      title: 'New Holiday',
      user: res.locals.user,
      csrfToken: res.locals.csrfToken,
      batches,
      today: todayInTimezone(),
      formErrors: { _general: err.message },
      formData: req.body,
      flash: null,
    });
  }
}

export function showEdit(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect('/holidays');
  }
  const holiday = getHolidayById(req.params.id);
  if (!holiday) return res.status(404).render('errors/404', { title: 'Not Found' });
  if (holiday.is_cancelled) {
    req.session.flash = { type: 'error', message: 'Cancelled holidays cannot be edited.' };
    return res.redirect('/holidays');
  }

  const batches = db.prepare('SELECT id, name, start_time, end_time FROM batches WHERE is_active = 1 ORDER BY id').all();
  const isAll = holiday.batches.some(b => b.batch_id === null);
  const selectedIds = holiday.batches.filter(b => b.batch_id).map(b => b.batch_id);

  res.render('holidays/edit', {
    title: `Edit — ${holiday.title}`,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    holiday,
    batches,
    formErrors: {},
    formData: {
      title: holiday.title,
      reason: holiday.reason || '',
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      is_full_day: !!holiday.is_full_day,
      partial_start: holiday.partial_start || '',
      partial_end: holiday.partial_end || '',
      all_batches: isAll,
      batch_ids: selectedIds,
    },
    flash: res.locals.flash,
  });
}

export function update(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect('/holidays');
  }
  const holidayId = parseInt(req.params.id, 10);
  const { title, reason, start_date, end_date, is_full_day, partial_start, partial_end } = req.body;
  const isFullDay = is_full_day === '1' || is_full_day === 'on';
  let batchIds = req.body.batch_ids || [];
  if (typeof batchIds === 'string') batchIds = [batchIds];
  if (req.body.all_batches === 'on' || req.body.all_batches === '1') batchIds = ['all'];

  try {
    updateHoliday({ holidayId, title, reason, startDate: start_date, endDate: end_date, isFullDay, partialStart: partial_start, partialEnd: partial_end, batchIds });
    audit(req, { action: 'holiday_updated', module: 'holiday', recordId: holidayId, newValues: { title, start_date, end_date } });
    req.session.flash = { type: 'success', message: 'Holiday updated.' };
    res.redirect('/holidays');
  } catch (err) {
    const holiday = getHolidayById(holidayId);
    const batches = db.prepare('SELECT id, name, start_time, end_time FROM batches WHERE is_active = 1 ORDER BY id').all();
    res.status(400).render('holidays/edit', {
      title: `Edit — ${holiday.title}`,
      user: res.locals.user,
      csrfToken: res.locals.csrfToken,
      holiday,
      batches,
      formErrors: { _general: err.message },
      formData: req.body,
      flash: null,
    });
  }
}

export function cancel(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect('/holidays');
  }
  try {
    const h = cancelHoliday({ holidayId: parseInt(req.params.id, 10), userId: req.session.user.id });
    audit(req, { action: 'holiday_cancelled', module: 'holiday', recordId: h.id });
    req.session.flash = { type: 'success', message: 'Holiday cancelled. Affected sessions reverted to scheduled.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect('/holidays');
}