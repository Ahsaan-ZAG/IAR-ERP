import db from '../config/database.js';

export function audit(req, { action, module, recordId = null, oldValues = null, newValues = null }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs
        (user_id, action, module, record_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.session?.user?.id ?? null,
      action,
      module,
      recordId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      req.ip ?? null,
      req.get('user-agent') ?? null
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}