export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');