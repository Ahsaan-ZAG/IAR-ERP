import argon2 from 'argon2';
import db from '../config/database.js';
import { generateCsrfToken } from '../config/security.js';
import { audit } from '../services/auditService.js';

export function showLogin(req, res) {
  if (req.session?.user) return res.redirect('/dashboard');
  res.render('auth/login', {
    title: 'Login | Imam Ahmed Raza Academy',
    csrfToken: generateCsrfToken(req, res),
    error: null,
  });
}

export function showMobileLogin(req, res) {
  if (req.session?.user && req.session.access_mode === 'mobile_readonly') {
    return res.redirect('/mobile/dashboard');
  }
  res.render('auth/mobile-login', {
    title: 'Mobile | Imam Ahmed Raza Academy',
    csrfToken: generateCsrfToken(req, res),
    error: null,
  });
}

async function performLogin(req, res, redirectTo, accessMode) {
  const { username, password } = req.body || {};
  const view = accessMode === 'mobile_readonly' ? 'auth/mobile-login' : 'auth/login';

  if (!username || !password) {
    return res.status(400).render(view, {
      title: 'Login | Imam Ahmed Raza Academy',
      csrfToken: generateCsrfToken(req, res),
      error: 'Username and password are required.',
    });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
    .get(username);

  if (!user) {
    audit(req, { action: 'login_failed', module: 'auth', newValues: { username } });
    return res.status(401).render(view, {
      title: 'Login | Imam Ahmed Raza Academy',
      csrfToken: generateCsrfToken(req, res),
      error: 'Invalid credentials.',
    });
  }

  const ok = await argon2.verify(user.password_hash, password);
  if (!ok) {
    audit(req, { action: 'login_failed', module: 'auth', newValues: { username } });
    return res.status(401).render(view, {
      title: 'Login | Imam Ahmed Raza Academy',
      csrfToken: generateCsrfToken(req, res),
      error: 'Invalid credentials.',
    });
  }

  // Update last_login_at
  try {
    db.prepare(
      "UPDATE users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), last_login_ip = ? WHERE id = ?"
    ).run(req.ip || null, user.id);
  } catch (err) {
    console.error('Failed to update last_login_at:', err.message);
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error');
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
    };
    req.session.access_mode = accessMode;
    audit(req, { action: 'login_success', module: 'auth', recordId: user.id });
    res.redirect(redirectTo);
  });
}

export function login(req, res) {
  return performLogin(req, res, '/dashboard', 'desktop');
}

export function mobileLogin(req, res) {
  return performLogin(req, res, '/mobile/dashboard', 'mobile_readonly');
}

export function logout(req, res) {
  audit(req, { action: 'logout', module: 'auth' });
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
}