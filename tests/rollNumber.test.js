import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/database.js';

test('roll number uniqueness is enforced', () => {
  db.exec('SAVEPOINT rn_test');
  try {
    const roll = 'UNIQ-' + Date.now();
    db.prepare(`
      INSERT INTO students (roll_no, name, father_name, admission_date)
      VALUES (?, 'A', 'B', date('now'))
    `).run(roll);

    assert.throws(
      () => db.prepare(`
        INSERT INTO students (roll_no, name, father_name, admission_date)
        VALUES (?, 'C', 'D', date('now'))
      `).run(roll),
      /UNIQUE constraint failed/
    );
  } finally {
    db.exec('ROLLBACK TO rn_test');
    db.exec('RELEASE rn_test');
  }
});
