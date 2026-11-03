import db from '../config/database.js';
import {
  ALLOWED_CHARTS, fetchChart, sanitizeParams, isAllowedChart, analyticsHealth,
} from '../services/analyticsService.js';

export async function page(req, res) {
  const students = db.prepare(`
    SELECT id, roll_no, name FROM students
    WHERE status = 'active' ORDER BY roll_no
  `).all();

  const online = await analyticsHealth();

  res.render('analytics/index', {
    title: 'Analytics',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    charts: ALLOWED_CHARTS,
    students,
    analyticsOnline: online,
    flash: res.locals.flash,
  });
}

export async function serveChart(req, res) {
  const name = req.params.name;

  if (!isAllowedChart(name)) {
    return res.status(404).json({ error: 'Unknown chart' });
  }

  const params = sanitizeParams(name, req.query);

  try {
    const { contentType, buffer } = await fetchChart(name, params);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${name}.png"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  } catch (err) {
    console.error('Analytics chart failed:', name, err.message);
    res.status(502).json({
      error: 'Analytics service unavailable',
      chart: name,
    });
  }
}