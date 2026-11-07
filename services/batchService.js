import db from '../config/database.js';

export function listBatches() {
  return db.prepare(`
    SELECT b.*,
           (SELECT COUNT(*) FROM students s WHERE s.current_batch_id = b.id AND s.status = 'active') AS active_students,
           (SELECT COUNT(*) FROM batch_sessions bs WHERE bs.batch_id = b.id AND bs.session_date = date('now')) AS today_sessions
    FROM batches b
    WHERE b.is_active = 1
    ORDER BY b.id
  `).all();
}

export function getBatchById(id) {
  return db.prepare(`
    SELECT b.*,
           (SELECT COUNT(*) FROM students s WHERE s.current_batch_id = b.id AND s.status = 'active') AS active_students
    FROM batches b WHERE b.id = ?
  `).get(id);
}

export function getBatchStudents(batchId) {
  return db.prepare(`
    SELECT id, roll_no, name, father_name, status
    FROM students
    WHERE current_batch_id = ?
    ORDER BY roll_no
  `).all(batchId);
}

export function getBatchRecentSessions(batchId, limit = 10) {
  return db.prepare(`
    SELECT bs.*, 
      (SELECT GROUP_CONCAT(u.display_name, ', ')
       FROM batch_session_teachers bst
       JOIN users u ON u.id = bst.teacher_user_id
       WHERE bst.session_id = bs.id) AS teachers
    FROM batch_sessions bs
    WHERE bs.batch_id = ?
    ORDER BY bs.session_date DESC, bs.id DESC
    LIMIT ?
  `).all(batchId, limit);
}

export function getBatchCompletionStats(batchId, monthStart) {
  const row = db.prepare(`
    SELECT 
      COUNT(*) AS total_sessions,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) AS missed_sessions
    FROM batch_sessions
    WHERE batch_id = ? AND session_date >= ?
  `).get(batchId, monthStart);
  return {
    total: row.total_sessions || 0,
    completed: row.completed_sessions || 0,
    missed: row.missed_sessions || 0,
    percentage: row.total_sessions ? Math.round((row.completed_sessions / row.total_sessions) * 100) : 0,
  };
}

export async function restoreUploadedBackup(uploadedPath, userId) {
  // 1. Verify uploaded file
  const src = new Database(uploadedPath, { readonly: true, fileMustExist: true });
  const integrity = src.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') {
    src.close();
    throw new Error(`Uploaded file integrity check failed: ${integrity}`);
  }
  const tables = src.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  if (tables.length === 0) {
    src.close();
    throw new Error('Uploaded file contains no tables');
  }
  src.close();

  // 2. Pre-upload safety backup
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const preRestoreName = `pre-upload-${ts}.sqlite`;
  const preRestorePath = path.join(BACKUP_DIR, preRestoreName);
  await db.backup(preRestorePath);

  db.prepare(`
    INSERT INTO backup_logs (filename, status, integrity_check, created_by)
    VALUES (?, 'success', 'pre-upload', ?)
  `).run(preRestoreName, userId || null);

  // 3. Copy data using ATTACH
  db.pragma('foreign_keys = OFF');
  try {
    const escapedPath = uploadedPath.replace(/'/g, "''");
    db.exec(`ATTACH DATABASE '${escapedPath}' AS restore_src`);

    for (const { name, sql } of tables) {
      const existsInMain = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
      if (!existsInMain && sql) db.exec(sql);

      const hasRows = db.prepare(`SELECT COUNT(*) AS c FROM restore_src.${name}`).get().c > 0;
      if (hasRows) {
        db.exec(`DELETE FROM main.${name}`);
        db.exec(`INSERT INTO main.${name} SELECT * FROM restore_src.${name}`);
      }
    }

    // Sequences
    const seqExists = db.prepare("SELECT name FROM restore_src.sqlite_master WHERE name = 'sqlite_sequence'").get();
    if (seqExists) {
      try {
        db.exec('DELETE FROM main.sqlite_sequence');
        db.exec('INSERT INTO main.sqlite_sequence SELECT * FROM restore_src.sqlite_sequence');
      } catch {}
    }
    db.exec('DETACH DATABASE restore_src');
  } catch (err) {
    try { db.exec('DETACH DATABASE restore_src'); } catch {}
    throw new Error(`Upload restore failed: ${err.message}. Safety backup saved as ${preRestoreName}`);
  } finally {
    db.pragma('foreign_keys = ON');
  }

  return { preRestoreBackup: preRestoreName };
}