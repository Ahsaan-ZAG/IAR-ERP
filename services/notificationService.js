import db from '../config/database.js';

export function listNotifications(userId, limit = 100) {
  return db.prepare(`
    SELECT * FROM notifications
    WHERE user_id IS NULL OR user_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit);
}

export function getUnreadCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS c FROM notifications
    WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0
  `).get(userId).c;
}

export function markRead(notificationId, userId) {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id IS NULL OR user_id = ?)').run(notificationId, userId);
}

export function markAllRead(userId) {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id IS NULL OR user_id = ?').run(userId);
}

export function createNotification({ userId, type, message, referenceType, referenceId }) {
  db.prepare(`INSERT INTO notifications (user_id, type, message, reference_type, reference_id)
    VALUES (?, ?, ?, ?, ?)`).run(userId || null, type, message, referenceType || null, referenceId || null);
}

export function notifyAdmins({ type, message, referenceType, referenceId }) {
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
  const ins = db.prepare('INSERT INTO notifications (user_id, type, message, reference_type, reference_id) VALUES (?, ?, ?, ?, ?)');
  for (const a of admins) ins.run(a.id, type, message, referenceType || null, referenceId || null);
}

export function broadcast({ type, message, referenceType, referenceId }) {
  const users = db.prepare('SELECT id FROM users WHERE is_active = 1').all();
  const ins = db.prepare('INSERT INTO notifications (user_id, type, message, reference_type, reference_id) VALUES (?, ?, ?, ?, ?)');
  for (const u of users) ins.run(u.id, type, message, referenceType || null, referenceId || null);
}