import { listBackups, createBackup, restoreBackup, getBackupPath } from '../services/backupService.js';
import { audit } from '../services/auditService.js';

export function index(req, res) {
  res.render('backups/index', {
    title: 'Backup & Restore',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    backups: listBackups(),
    flash: res.locals.flash,
  });
}

export async function postCreate(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect('/backups');
  }
  try {
    const result = await createBackup(req.session.user.id);
    audit(req, {
      action: 'backup_created', module: 'backup',
      newValues: { filename: result.filename, size_bytes: result.size_bytes },
    });
    req.session.flash = {
      type: 'success',
      message: `Backup created: ${result.filename} (${(result.size_bytes / 1024).toFixed(1)} KB)`,
    };
  } catch (err) {
    req.session.flash = { type: 'error', message: `Backup failed: ${err.message}` };
  }
  res.redirect('/backups');
}

export function download(req, res) {
  if (req.session.user.role !== 'admin') {
    return res.status(403).send('Admin only');
  }
  try {
    const fullPath = getBackupPath(req.params.filename);
    res.download(fullPath, req.params.filename);
  } catch (err) {
    res.status(400).send(err.message);
  }
}

export async function postRestore(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect('/backups');
  }
  if (req.body.confirm !== 'RESTORE') {
    req.session.flash = { type: 'error', message: 'Type RESTORE to confirm.' };
    return res.redirect('/backups');
  }
  const filename = req.body.filename;
  try {
    const result = await restoreBackup(filename, req.session.user.id);
    audit(req, {
      action: 'database_restored', module: 'backup',
      newValues: { restored_from: filename, pre_restore: result.preRestoreBackup },
    });
    req.session.flash = {
      type: 'success',
      message: `Database restored from ${filename}. Safety backup: ${result.preRestoreBackup}`,
    };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect('/backups');
}