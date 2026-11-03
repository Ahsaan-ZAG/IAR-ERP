import { globalSearch } from '../services/searchService.js';

export function index(req, res) {
  const q = (req.query.q || '').trim();
  const results = globalSearch(q, req.session.user.role);
  res.render('search/index', {
    title: 'Search', user: res.locals.user, csrfToken: res.locals.csrfToken,
    q, results, flash: res.locals.flash,
  });
}