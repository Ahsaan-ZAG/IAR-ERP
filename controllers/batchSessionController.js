import db from '../config/database.js';
import { listSessions, getSessionById, getSessionTeachers, generateDailySessions, startSession, completeSession } from '../services/batchSessionService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone, nowTimeInTimezone } from '../config/timezone.js'; // Bas ye ek line

export function index(req, res) {
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  const filters = {
    batchId: req.query.batch ? parseInt(req.query.batch, 10) : null,
    date: req.query.date || todayInTimezone(),
    status: req.query.status || '',
  };
  const sessions = listSessions(filters);

  res.render('batch-sessions/index', {
    title: 'Batch Sessions',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    sessions,
    batches,
    filters,
    flash: res.locals.flash,
  });
}

export function generate(req, res) {
  const date = req.body.date || todayInTimezone();
  try {
    const count = generateDailySessions(date);
    audit(req, { action: 'sessions_generated', module: 'batch_session', newValues: { date, count } });
    req.session.flash = { type: 'success', message: `Sessions generated for ${date}.` };
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Failed to generate sessions.' };
  }
  res.redirect(`/batch-sessions?date=${date}`);
}

export function show(req, res) {
  const session = getSessionById(req.params.id);
  if (!session) return res.status(404).render('errors/404', { title: 'Session Not Found' });
  const teachers = getSessionTeachers(session.id);

  res.render('batch-sessions/show', {
    title: `Session — ${session.batch_name} — ${session.session_date}`,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    session,
    teachers,
    flash: res.locals.flash,
  });
}

export function start(req, res) {
  const sessionId = parseInt(req.params.id, 10);
  const now = nowTimeInTimezone()
  try {
    startSession({ sessionId, userId: req.session.user.id, time: now });
    audit(req, { action: 'session_started', module: 'batch_session', recordId: sessionId });
    req.session.flash = { type: 'success', message: 'Session started.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect(`/batch-sessions/${sessionId}`);
}

export function complete(req, res) {
  const sessionId = parseInt(req.params.id, 10);
  const now = nowTimeInTimezone();
  const { topic, remarks } = req.body;

  try {
    completeSession({ sessionId, userId: req.session.user.id, time: now, topic, remarks });
    audit(req, {
      action: 'session_completed', module: 'batch_session', recordId: sessionId,
      newValues: { topic, remarks },
    });
    req.session.flash = { type: 'success', message: 'Session marked complete.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect(`/batch-sessions/${sessionId}`);
}
