import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getAuditLogs(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    const logs = db.prepare(`
      SELECT al.*, u.display_name AS user_name
      FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT 100
    `).all();
    return sendSuccess(res, logs, 'Audit logs');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}