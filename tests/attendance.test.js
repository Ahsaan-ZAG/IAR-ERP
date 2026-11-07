import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/database.js';
import { saveBatchAttendance } from '../services/attendanceService.js';

let adminId, batchId;

test.before(() => {
  adminId = db.prepare("SELECT id FROM users WHERE role = 'admin'").get()?.id || 1;
  batchId = db.prepare('SELECT id FROM batches ORDER BY id LIMIT 1').get().id;
});

function withRollback(fn) {
  db.exec('SAVEPOINT test_rollback');
  try { fn(); }
  finally {
    db.exec('ROLLBACK TO test_rollback');
    db.exec('RELEASE test_rollback');
  }
}

test('duplicate attendance is prevented by UNIQUE constraint', () => {
  withRollback(() => {
    const s = db.prepare(`
      INSERT INTO students (roll_no, name, father_name, admission_date, current_batch_id, status)
      VALUES (?, 'AttTest', 'X', date('now'), ?, 'active')
    `).run('ATT-' + Date.now(), batchId);
    const sid = Number(s.lastInsertRowid);
    const date = '2099-01-15'; // future date to avoid collision

    const r1 = saveBatchAttendance({
      batchId, date,
      entries: [{ studentId: sid, status: 'present' }],
      userId: adminId,
    });
    assert.equal(r1[0].action, 'created');

    const r2 = saveBatchAttendance({
      batchId, date,
      entries: [{ studentId: sid, status: 'absent' }],
      userId: adminId,
    });
    assert.equal(r2[0].action, 'updated');
    assert.equal(r2[0].oldStatus, 'present');
    assert.equal(r2[0].newStatus, 'absent');

    const count = db.prepare('SELECT COUNT(*) AS c FROM attendance WHERE student_id = ? AND date = ?').get(sid, date).c;
    assert.equal(count, 1);
  });
});