import { generateCsrfToken } from '../config/security.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function mobileReadOnly(req, res, next) {
  if (req.session?.access_mode !== 'mobile_readonly') return next();
  if (!WRITE_METHODS.has(req.method)) return next();

  // Logout must always work
  if (req.path === '/auth/logout' || req.path === '/mobile/logout') {
    return next();
  }

  const wantsJSON =
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json')) ||
    (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));

  if (wantsJSON) {
    return res.status(403).json({
      error: 'Mobile PWA is strictly read-only.',
      hint: 'Logout and login via /login to make changes.',
      action: 'switch_to_desktop',
    });
  }

  const token = generateCsrfToken(req, res);
  res.status(403).render('errors/mobile-readonly', {
    title: 'Read-Only Mode',
    user: req.session?.user,
    csrfToken: token,
  });
}