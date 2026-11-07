import db from '../config/database.js';

export const EDITABLE_KEYS = [
  'academy_name',
  'academy_supervision',
  'roll_prefix',
];

export function getAllSettings() {
  const rows = db.prepare('SELECT * FROM settings ORDER BY key').all();
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export const updateSettings = db.transaction((updates) => {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `);
  const changed = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!EDITABLE_KEYS.includes(key)) continue;
    const trimmed = String(value ?? '').trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > 120) throw new Error(`Setting "${key}" too long`);
    stmt.run(key, trimmed);
    changed[key] = trimmed;
  }
  return changed;
});