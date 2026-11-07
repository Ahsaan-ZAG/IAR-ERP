import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const SAFE_NAME = /^[a-z0-9._-]+\.sqlite$/i;

function assertSafeName(filename) {
  if (!SAFE_NAME.test(filename)) throw new Error('Invalid backup filename');
  const full = path.join(BACKUP_DIR, filename);
  if (!path.resolve(full).startsWith(path.resolve(BACKUP_DIR))) {
    throw new Error('Path traversal blocked');
  }
  return full;
}

export function listBackups() {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sqlite'));
  return files.map(f => {
    const full = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(full);
    return {
      filename: f,
      size_bytes: stat.size,
      created_at: stat.mtime.toISOString(),
      is_pre_restore: f.startsWith('pre-restore-'),
    };
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getBackupPath(filename) {
  return assertSafeName(filename);
}

export async function createBackup(userId) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `academy-${ts}.sqlite`;
  const fullPath = path.join(BACKUP_DIR, filename);

  let integrity = 'unknown';
  try {
    await db.backup(fullPath);

    // Verify by opening read-only
    const verify = new Database(fullPath, { readonly: true, fileMustExist: true });
    integrity = verify.pragma('integrity_check', { simple: true });
    verify.close();
    if (integrity !== 'ok') throw new Error(`Integrity check failed: ${integrity}`);

    db.prepare(`
      INSERT INTO backup_logs (filename, status, integrity_check, created_by)
      VALUES (?, 'success', ?, ?)
    `).run(filename, integrity, userId || null);

    return { filename, size_bytes: fs.statSync(fullPath).size, integrity };
  } catch (err) {
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {}
    try {
      db.prepare(`
        INSERT INTO backup_logs (filename, status, integrity_check, created_by)
        VALUES (?, 'failed', ?, ?)
      `).run(filename, String(err.message).slice(0, 200), userId || null);
    } catch {}
    throw err;
  }
}

export async function restoreBackup(filename, userId) {
  const backupPath = assertSafeName(filename);

  if (!fs.existsSync(backupPath)) throw new Error('Backup file not found');

  // 1. Verify integrity
  const src = new Database(backupPath, { readonly: true, fileMustExist: true });
  const integrity = src.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') {
    src.close();
    throw new Error(`Backup integrity check failed: ${integrity}`);
  }
  const tables = src.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all();
  src.close();

  // 2. Pre-restore safety backup
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const preRestoreName = `pre-restore-${ts}.sqlite`;
  const preRestorePath = path.join(BACKUP_DIR, preRestoreName);
  await db.backup(preRestorePath);

  db.prepare(`
    INSERT INTO backup_logs (filename, status, integrity_check, created_by)
    VALUES (?, 'success', 'pre-restore', ?)
  `).run(preRestoreName, userId || null);

  // 3. Restore by copying each table via ATTACH
  db.pragma('foreign_keys = OFF');
  try {
    const escapedPath = backupPath.replace(/'/g, "''");
    db.exec(`ATTACH DATABASE '${escapedPath}' AS restore_src`);

    for (const { name, sql } of tables) {
      const existsInMain = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(name);

      if (!existsInMain && sql) {
        db.exec(sql);
      }

      const hasRows = db.prepare(`SELECT COUNT(*) AS c FROM restore_src.${name}`).get().c > 0;
      if (hasRows) {
        db.exec(`DELETE FROM main.${name}`);
        db.exec(`INSERT INTO main.${name} SELECT * FROM restore_src.${name}`);
      }
    }

    // Restore auto-increment sequences
    const seqExists = db.prepare(
      "SELECT name FROM restore_src.sqlite_master WHERE name = 'sqlite_sequence'"
    ).get();
    if (seqExists) {
      try {
        db.exec('DELETE FROM main.sqlite_sequence');
        db.exec('INSERT INTO main.sqlite_sequence SELECT * FROM restore_src.sqlite_sequence');
      } catch {}
    }

    db.exec('DETACH DATABASE restore_src');
  } catch (err) {
    try { db.exec('DETACH DATABASE restore_src'); } catch {}
    throw new Error(`Restore failed: ${err.message}. Pre-restore backup saved as ${preRestoreName}`);
  } finally {
    db.pragma('foreign_keys = ON');
  }

  return { preRestoreBackup: preRestoreName };
}