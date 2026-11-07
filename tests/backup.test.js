import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { createBackup, listBackups, getBackupPath } from '../services/backupService.js';

test('backup creates a valid file and lists it', async () => {
  const adminId = 1;
  const r = await createBackup(adminId);

  assert.ok(r.filename.endsWith('.sqlite'));
  assert.ok(r.size_bytes > 0);
  assert.equal(r.integrity, 'ok');

  const fullPath = getBackupPath(r.filename);
  assert.ok(fs.existsSync(fullPath));

  const list = listBackups();
  assert.ok(list.some(b => b.filename === r.filename));

  // Cleanup
  try { fs.unlinkSync(fullPath); } catch {}
});

test('path traversal is blocked', () => {
  assert.throws(() => getBackupPath('../../etc/passwd'), /Invalid/);
  assert.throws(() => getBackupPath('bad name.sqlite'), /Invalid/);
});