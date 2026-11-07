import { validationResult } from 'express-validator';
import { listUsers, getUserById, createUser, updateUser, resetPassword } from '../services/userService.js';
import { audit } from '../services/auditService.js';

export function index(req, res) {
  res.render('users/index', {
    title: 'User Management', user: res.locals.user, csrfToken: res.locals.csrfToken,
    users: listUsers(), flash: res.locals.flash,
  });
}

export function showNew(req, res) {
  res.render('users/new', {
    title: 'New User', user: res.locals.user, csrfToken: res.locals.csrfToken,
    formErrors: {}, formData: {}, flash: res.locals.flash,
  });
}

export async function create(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    return res.status(400).render('users/new', {
      title: 'New User', user: res.locals.user, csrfToken: res.locals.csrfToken,
      formErrors: { _general: v.array()[0].msg }, formData: req.body, flash: null,
    });
  }
  try {
    const id = await createUser({
      username: req.body.username, password: req.body.password,
      displayName: req.body.display_name, role: req.body.role,
    });
    audit(req, { action: 'user_created', module: 'user', recordId: id, newValues: { username: req.body.username, role: req.body.role } });
    req.session.flash = { type: 'success', message: 'User created.' };
    res.redirect('/users');
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect('/users/new');
  }
}

export function show(req, res) {
  const u = getUserById(req.params.id);
  if (!u) return res.status(404).render('errors/404', { title: 'Not Found' });
  res.render('users/show', {
    title: u.display_name, user: res.locals.user, csrfToken: res.locals.csrfToken,
    targetUser: u, flash: res.locals.flash,
  });
}

export function update(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    req.session.flash = { type: 'error', message: v.array()[0].msg };
    return res.redirect(`/users/${req.params.id}`);
  }
  try {
    updateUser({
      userId: parseInt(req.params.id, 10), displayName: req.body.display_name,
      role: req.body.role, isActive: req.body.is_active === '1',
    });
    audit(req, { action: 'user_updated', module: 'user', recordId: req.params.id, newValues: req.body });
    req.session.flash = { type: 'success', message: 'User updated.' };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect(`/users/${req.params.id}`);
}

export async function postResetPassword(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    req.session.flash = { type: 'error', message: v.array()[0].msg };
    return res.redirect(`/users/${req.params.id}`);
  }
  try {
    await resetPassword({ userId: parseInt(req.params.id, 10), newPassword: req.body.new_password });
    audit(req, { action: 'user_password_reset', module: 'user', recordId: req.params.id });
    req.session.flash = { type: 'success', message: 'Password reset.' };
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect(`/users/${req.params.id}`);
}