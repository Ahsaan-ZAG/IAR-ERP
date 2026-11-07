import { REPORT_LIST, generateReportPDF, generateReportCSV } from '../services/reportService.js';
import { todayInTimezone } from '../config/timezone.js';

export function index(req, res) {
  const now = new Date();
  const monthStart = now.toISOString().slice(0, 7) + '-01';
  const today = todayInTimezone();
  res.render('reports/index', {
    title: 'Reports', user: res.locals.user, csrfToken: res.locals.csrfToken,
    reports: REPORT_LIST, today, monthStart, flash: res.locals.flash,
  });
}

export function downloadPDF(req, res) {
  generateReportPDF(req.params.key, res, {
    from: req.query.from, to: req.query.to, batch: req.query.batch,
  });
}

export function downloadCSV(req, res) {
  generateReportCSV(req.params.key, res, {
    from: req.query.from, to: req.query.to, batch: req.query.batch,
  });
}