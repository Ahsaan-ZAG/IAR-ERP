import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/database.js';
import { isHolidayForBatch, createHoliday, cancelHoliday } from '../services/holidayService.js';

let adminId, batchId, secondBatchId;
test.before(() => {
  adminId = db.prepare("SELECT id FROM users WHERE role = 'admin'").get()?.id || 1;
  batchId = db.prepare('SELECT id FROM batches ORDER BY id LIMIT 1').get().id;
  secondBatchId = db.prepare('SELECT id FROM batches ORDER BY id LIMIT 1 OFFSET 1').get().id;
});

function cleanup(title) {
  db.prepare("DELETE FROM holiday_batches WHERE holiday_id IN (SELECT id FROM holidays WHERE title = ?)").run(title);
  db.prepare("DELETE FROM holidays WHERE title = ?").run(title);
}

test('full-day holiday blocks its target batch', () => {
  const title = 'TEST-FULL-' + Date.now();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const id = createHoliday({
      title, reason: 'Test', startDate: today, endDate: today,
      isFullDay: true, partialStart: null, partialEnd: null,
      batchIds: [batchId], userId: adminId,
    });
    const result = isHolidayForBatch(batchId, today);
    assert.ok(result !== false, 'should be holiday');
    assert.equal(result.isFullDay, true);
  } finally {
    cleanup(title);
  }
});

test('batch-specific holiday does NOT affect other batches', () => {
  const title = 'TEST-SPECIFIC-' + Date.now();
  try {
    const today = new Date().toISOString().slice(0, 10);
    createHoliday({
      title, reason: 'Test', startDate: today, endDate: today,
      isFullDay: true, partialStart: null, partialEnd: null,
      batchIds: [batchId], userId: adminId,
    });
    assert.ok(isHolidayForBatch(batchId, today) !== false);
    assert.equal(isHolidayForBatch(secondBatchId, today), false);
  } finally {
    cleanup(title);
  }
});

test('cancelled holiday no longer affects batch', () => {
  const title = 'TEST-CANCEL-' + Date.now();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const id = createHoliday({
      title, reason: 'Test', startDate: today, endDate: today,
      isFullDay: true, partialStart: null, partialEnd: null,
      batchIds: [batchId], userId: adminId,
    });
    cancelHoliday({ holidayId: id, userId: adminId });
    assert.equal(isHolidayForBatch(batchId, today), false);
  } finally {
    cleanup(title);
  }
});