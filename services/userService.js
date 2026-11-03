import argon2 from 'argon2';
import db from '../config/database.js';

export async function createUser({ username, password, displayName, role }) {
  if (!username || !password || !displayName) throw new Error('All fields are required');
  if (!['admin', 'teacher'].includes(role)) throw new Error('Invalid role');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) throw new Error('Username already exists');
  const hash = await argon2.hash(password);
  const info = db.prepare('INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)').run(username, hash, role, displayName);
  const userId = Number(info.lastInsertRowid);
  if (role === 'teacher') {
    db.prepare("INSERT OR IGNORE INTO teachers (user_id, joining_date, status) VALUES (?, date('now'), 'active')").run(userId);
  }
  return userId;
}

export function updateUser({ userId, displayName, role, isActive }) {
  if (!['admin', 'teacher'].includes(role)) throw new Error('Invalid role');
  db.prepare(`UPDATE users SET display_name = ?, role = ?, is_active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
    .run(displayName, role, isActive ? 1 : 0, userId);
}

export async function resetPassword({ userId, newPassword }) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  const hash = await argon2.hash(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
}

export function listUsers() {
  return db.prepare(`SELECT id, username, display_name, role, is_active, last_login_at, created_at
    FROM users ORDER BY id`).all();
}

export function getUserById(id) {
  return db.prepare('SELECT id, username, display_name, role, is_active, last_login_at, created_at FROM users WHERE id = ?').get(id);
}