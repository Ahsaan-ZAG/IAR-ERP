export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.redirect(req.session?.access_mode === 'mobile_readonly' ? '/mobile/login' : '/login');
  }
  next();
}

export function requireAuthApi(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}