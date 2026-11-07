import db from '../config/database.js';

export function index(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = 50;
  const cond = [], params = [];
  if (req.query.user) { cond.push('al.user_id = ?'); params.push(parseInt(req.query.user, 10)); }
  if (req.query.module) { cond.push('al.module = ?'); params.push(req.query.module); }
  if (req.query.from) { cond.push('al.created_at >= ?'); params.push(req.query.from); }
  if (req.query.to) { cond.push('al.created_at <= ?'); params.push(req.query.to + 'T23:59:59'); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM audit_logs al ${where}`).get(...params).c;
  const offset = (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT al.*, u.display_name AS user_name
    FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
    ${where} ORDER BY al.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  const users = db.prepare('SELECT id, display_name FROM users ORDER BY display_name').all();
  const modules = db.prepare('SELECT DISTINCT module FROM audit_logs ORDER BY module').all().map(r => r.module);

  res.render('audit-logs/index', {
    title: 'Audit Logs', user: res.locals.user, csrfToken: res.locals.csrfToken,
    logs: rows, users, modules,
    filters: { user: req.query.user || '', module: req.query.module || '', from: req.query.from || '', to: req.query.to || '' },
    pagination: { page, totalPages: Math.max(1, Math.ceil(total / pageSize)), total },
    flash: res.locals.flash,
  });
}