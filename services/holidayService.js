import db from '../config/database.js';

export function timeRangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

function generateDateRange(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Kya diya gaya batch+date ek holiday hai?
 * Returns false or { holiday, isFullDay }
 */
export function isHolidayForBatch(batchId, date) {
  const batch = db.prepare('SELECT start_time, end_time FROM batches WHERE id = ?').get(batchId);
  if (!batch) return false;

  const rows = db.prepare(`
    SELECT h.*, hb.is_special_working, hb.batch_id AS specific_batch_id
    FROM holidays h
    LEFT JOIN holiday_batches hb ON hb.holiday_id = h.id
    WHERE h.is_cancelled = 0
      AND ? BETWEEN h.start_date AND h.end_date
      AND (hb.batch_id IS NULL OR hb.batch_id = ?)
  `).all(date, batchId);

  for (const h of rows) {
    if (h.is_special_working) continue;
    if (h.is_full_day) return { holiday: h, isFullDay: true };
    if (h.partial_start && h.partial_end) {
      if (timeRangesOverlap(batch.start_time, batch.end_time, h.partial_start, h.partial_end)) {
        return { holiday: h, isFullDay: false };
      }
    } else {
      return { holiday: h, isFullDay: true };
    }
  }
  return false;
}

export function listHolidays({ fromDate, toDate, includeCancelled = false }) {
  const cond = [];
  const params = [];
  if (!includeCancelled) cond.push('h.is_cancelled = 0');
  if (fromDate) { cond.push('h.end_date >= ?'); params.push(fromDate); }
  if (toDate) { cond.push('h.start_date <= ?'); params.push(toDate); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  return db.prepare(`
    SELECT h.*, u.display_name AS created_by_name,
      (SELECT GROUP_CONCAT(COALESCE(b.name, 'All Batches'), ', ')
       FROM holiday_batches hb LEFT JOIN batches b ON b.id = hb.batch_id
       WHERE hb.holiday_id = h.id) AS affected_batches
    FROM holidays h LEFT JOIN users u ON u.id = h.created_by
    ${where} ORDER BY h.start_date DESC
  `).all(...params);
}

export function getHolidayById(id) {
  const h = db.prepare(`
    SELECT h.*, u.display_name AS created_by_name
    FROM holidays h LEFT JOIN users u ON u.id = h.created_by WHERE h.id = ?
  `).get(id);
  if (!h) return null;
  h.batches = db.prepare(`
    SELECT hb.*, b.name AS batch_name, b.start_time, b.end_time
    FROM holiday_batches hb LEFT JOIN batches b ON b.id = hb.batch_id
    WHERE hb.holiday_id = ?
  `).all(id);
  return h;
}

function applySessionsAsHoliday(holidayId, startDate, endDate, batchIds, isFullDay, partialStart, partialEnd) {
  const dates = generateDateRange(startDate, endDate);
  const allBatches = db.prepare('SELECT id, start_time, end_time FROM batches WHERE is_active = 1').all();

  let targetIds;
  if (!batchIds || batchIds.length === 0 || batchIds.includes('all')) {
    targetIds = allBatches.map(b => b.id);
  } else {
    targetIds = batchIds.map(Number);
  }

  for (const date of dates) {
    for (const bid of targetIds) {
      let shouldMark = true;
      if (!isFullDay && partialStart && partialEnd) {
        const b = allBatches.find(x => x.id === bid);
        shouldMark = b ? timeRangesOverlap(b.start_time, b.end_time, partialStart, partialEnd) : false;
      }
      if (shouldMark) {
        db.prepare(`
          UPDATE batch_sessions SET status = 'holiday'
          WHERE batch_id = ? AND session_date = ? AND status = 'scheduled'
        `).run(bid, date);
      }
    }
  }
}

export const createHoliday = db.transaction(({ title, reason, startDate, endDate, isFullDay, partialStart, partialEnd, batchIds, userId }) => {
  if (!title || !startDate || !endDate) throw new Error('Title, start date, end date required');
  if (startDate > endDate) throw new Error('Start date must be on or before end date');
  if (!isFullDay && (!partialStart || !partialEnd)) throw new Error('Partial day requires start and end time');
  if (!isFullDay && partialStart >= partialEnd) throw new Error('Partial start must be before partial end');

  const info = db.prepare(`
    INSERT INTO holidays (title, reason, start_date, end_date, is_full_day, partial_start, partial_end, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, reason || null, startDate, endDate, isFullDay ? 1 : 0, partialStart || null, partialEnd || null, userId);

  const holidayId = Number(info.lastInsertRowid);

  if (!batchIds || batchIds.length === 0 || batchIds.includes('all')) {
    db.prepare('INSERT INTO holiday_batches (holiday_id, batch_id) VALUES (?, NULL)').run(holidayId);
  } else {
    for (const bid of batchIds) {
      db.prepare('INSERT INTO holiday_batches (holiday_id, batch_id) VALUES (?, ?)').run(holidayId, bid);
    }
  }

  applySessionsAsHoliday(holidayId, startDate, endDate, batchIds, isFullDay, partialStart, partialEnd);

  // Notify all active users
  const users = db.prepare('SELECT id FROM users WHERE is_active = 1').all();
  const msg = `Holiday: ${title} (${startDate}${startDate !== endDate ? ' → ' + endDate : ''})${!isFullDay ? ' [partial]' : ''}`;
  const ins = db.prepare(`INSERT INTO notifications (user_id, type, message, reference_type, reference_id)
    VALUES (?, 'holiday', ?, 'holiday', ?)`);
  for (const u of users) ins.run(u.id, msg, holidayId);

  return holidayId;
});

export const updateHoliday = db.transaction(({ holidayId, title, reason, startDate, endDate, isFullDay, partialStart, partialEnd, batchIds }) => {
  const h = db.prepare('SELECT * FROM holidays WHERE id = ?').get(holidayId);
  if (!h) throw new Error('Holiday not found');
  if (h.is_cancelled) throw new Error('Cannot edit a cancelled holiday');
  if (!title || !startDate || !endDate) throw new Error('Title, start date, end date required');
  if (startDate > endDate) throw new Error('Invalid date range');

  db.prepare(`
    UPDATE holidays SET title = ?, reason = ?, start_date = ?, end_date = ?,
      is_full_day = ?, partial_start = ?, partial_end = ?
    WHERE id = ?
  `).run(title, reason || null, startDate, endDate, isFullDay ? 1 : 0, partialStart || null, partialEnd || null, holidayId);

  db.prepare('DELETE FROM holiday_batches WHERE holiday_id = ?').run(holidayId);
  if (!batchIds || batchIds.length === 0 || batchIds.includes('all')) {
    db.prepare('INSERT INTO holiday_batches (holiday_id, batch_id) VALUES (?, NULL)').run(holidayId);
  } else {
    for (const bid of batchIds) {
      db.prepare('INSERT INTO holiday_batches (holiday_id, batch_id) VALUES (?, ?)').run(holidayId, bid);
    }
  }
  return holidayId;
});

export const cancelHoliday = db.transaction(({ holidayId, userId }) => {
  const h = db.prepare('SELECT * FROM holidays WHERE id = ?').get(holidayId);
  if (!h) throw new Error('Holiday not found');
  if (h.is_cancelled) throw new Error('Already cancelled');

  db.prepare('UPDATE holidays SET is_cancelled = 1 WHERE id = ?').run(holidayId);

  // Revert sessions back to 'scheduled' where they were set to 'holiday'
  const hb = db.prepare('SELECT batch_id FROM holiday_batches WHERE holiday_id = ?').all(holidayId);
  const isAll = hb.some(r => r.batch_id === null);
  const dates = generateDateRange(h.start_date, h.end_date);

  for (const date of dates) {
    if (isAll) {
      db.prepare("UPDATE batch_sessions SET status = 'scheduled' WHERE session_date = ? AND status = 'holiday'").run(date);
    } else {
      for (const row of hb) {
        if (row.batch_id) {
          db.prepare("UPDATE batch_sessions SET status = 'scheduled' WHERE batch_id = ? AND session_date = ? AND status = 'holiday'").run(row.batch_id, date);
        }
      }
    }
  }
  return h;
});