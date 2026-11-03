import { listBatches, getBatchById, getBatchStudents, getBatchRecentSessions, getBatchCompletionStats } from '../services/batchService.js';
import { todayInTimezone } from '../config/timezone.js';

export function list(req, res) {
  const batches = listBatches();
  res.render('batches/index', {
    title: 'Batches',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    batches,
    flash: res.locals.flash,
  });
}

export function show(req, res) {
  const batch = getBatchById(req.params.id);
  if (!batch) return res.status(404).render('errors/404', { title: 'Batch Not Found' });

  const students = getBatchStudents(batch.id);
  const sessions = getBatchRecentSessions(batch.id, 15);
  const monthStart = todayInTimezone().slice(0, 7) + '-01';
  const completion = getBatchCompletionStats(batch.id, monthStart);

  res.render('batches/show', {
    title: batch.name,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    batch,
    students,
    sessions,
    completion,
    flash: res.locals.flash,
  });
}