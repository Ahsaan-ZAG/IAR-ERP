import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/database.js';
import { addCharge, addDiscount, addAdjustment, getStudentBalance } from '../services/feeService.js';
import { createPayment, reversePayment } from '../services/paymentService.js';

let adminId;
test.before(() => {
  adminId = db.prepare("SELECT id FROM users WHERE role = 'admin'").get()?.id || 1;
});

function withRollback(fn) {
  db.exec('SAVEPOINT test_rollback');
  try { fn(); }
  finally {
    db.exec('ROLLBACK TO test_rollback');
    db.exec('RELEASE test_rollback');
  }
}

function makeTestStudent() {
  const info = db.prepare(`
    INSERT INTO students (roll_no, name, father_name, admission_date, status)
    VALUES (?, 'Test Student', 'Test Father', date('now'), 'active')
  `).run('TST-' + Math.random().toString(36).slice(2, 8));
  return Number(info.lastInsertRowid);
}

test('signed-amount ledger produces correct balance', () => {
  withRollback(() => {
    const sid = makeTestStudent();
    addCharge({ studentId: sid, amount: 2000, description: 'Fee', dueDate: null, userId: adminId });
    addDiscount({ studentId: sid, amount: 300, description: 'Discount', userId: adminId });
    addAdjustment({ studentId: sid, amount: 100, direction: 'subtract', description: 'Adjust', userId: adminId });
    assert.equal(getStudentBalance(sid), 1600);
  });
});

test('partial payment reduces balance', () => {
  withRollback(() => {
    const sid = makeTestStudent();
    addCharge({ studentId: sid, amount: 2000, description: 'Fee', dueDate: null, userId: adminId });
    createPayment({ studentId: sid, amount: 1200, method: 'cash', notes: null, userId: adminId });
    assert.equal(getStudentBalance(sid), 800);
  });
});

test('payment reversal restores full balance and preserves history', () => {
  withRollback(() => {
    const sid = makeTestStudent();
    addCharge({ studentId: sid, amount: 2000, description: 'Fee', dueDate: null, userId: adminId });
    const { paymentId } = createPayment({
      studentId: sid, amount: 1200, method: 'cash', notes: null, userId: adminId,
    });
    assert.equal(getStudentBalance(sid), 800);

    reversePayment({ paymentId, reason: 'Test reversal', userId: adminId });
    assert.equal(getStudentBalance(sid), 2000);

    const count = db.prepare(
      "SELECT COUNT(*) AS c FROM student_fee_ledger WHERE student_id = ? AND entry_type = 'reversal'"
    ).get(sid).c;
    assert.equal(count, 1);
  });
});

test('amount must be a positive integer', () => {
  withRollback(() => {
    const sid = makeTestStudent();
    assert.throws(() => addCharge({ studentId: sid, amount: 0, description: 'X', dueDate: null, userId: adminId }));
    assert.throws(() => addCharge({ studentId: sid, amount: -5, description: 'X', dueDate: null, userId: adminId }));
    assert.throws(() => addCharge({ studentId: sid, amount: 1.5, description: 'X', dueDate: null, userId: adminId }));
  });
});