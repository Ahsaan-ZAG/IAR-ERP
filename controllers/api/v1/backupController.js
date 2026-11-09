import { listBackups, createBackup, getBackupPath } from '../../../services/backupService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getBackups(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try { return sendSuccess(res, listBackups(), 'Backups list'); } 
  catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}

export async function postCreateBackup(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    const result = await createBackup(req.apiUser.id);
    return sendSuccess(res, result, 'Backup created');
  } catch (err) { return sendError(res, err.message, 'INTERNAL_ERROR', 500); }
}

export function downloadBackup(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    const path = getBackupPath(req.params.filename);
    res.download(path, req.params.filename);
  } catch (err) { res.status(400).send(err.message); }
}