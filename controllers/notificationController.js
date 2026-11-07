import { listNotifications, markRead, markAllRead, broadcast } from '../services/notificationService.js';
import { audit } from '../services/auditService.js';

export function index(req, res) {
  res.render('notifications/index', {
    title: 'Notifications', user: res.locals.user, csrfToken: res.locals.csrfToken,
    notifications: listNotifications(req.session.user.id, 100), flash: res.locals.flash,
  });
}

export function postRead(req, res) {
  markRead(parseInt(req.params.id, 10), req.session.user.id);
  res.redirect(req.get('referer') || '/notifications');
}

export function postReadAll(req, res) {
  markAllRead(req.session.user.id);
  req.session.flash = { type: 'success', message: 'All notifications marked as read.' };
  res.redirect('/notifications');
}

export function postBroadcast(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect('/notifications');
  }
  const message = (req.body.message || '').trim();
  if (message.length < 3) {
    req.session.flash = { type: 'error', message: 'Message too short.' };
    return res.redirect('/notifications');
  }
  broadcast({ type: 'announcement', message });
  audit(req, { action: 'announcement_sent', module: 'notification', newValues: { message } });
  req.session.flash = { type: 'success', message: 'Announcement broadcast to all users.' };
  res.redirect('/notifications');
}