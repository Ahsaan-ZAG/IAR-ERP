import db from '../config/database.js';

export function listAssignments({ batchId }) {
  const cond = [], params = [];
  if (batchId) { cond.push('a.batch_id = ?'); params.push(batchId); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  return db.prepare(`
    SELECT a.*, b.name AS batch_name, u.display_name AS created_by_name,
      (SELECT COUNT(*) FROM student_assignment_status WHERE assignment_id = a.id AND status IN ('submitted','late','graded')) AS submitted_count,
      (SELECT COUNT(*) FROM student_assignment_status WHERE assignment_id = a.id AND status = 'pending') AS pending_count
    FROM assignments a
    JOIN batches b ON b.id = a.batch_id
    LEFT JOIN users u ON u.id = a.created_by
    ${where}
    ORDER BY a.assigned_date DESC, a.id DESC
  `).all(...params);
}

export function getAssignmentById(id) {
  return db.prepare(`
    SELECT a.*, b.name AS batch_name, u.display_name AS created_by_name
    FROM assignments a
    JOIN batches b ON b.id = a.batch_id
    LEFT JOIN users u ON u.id = a.created_by
    WHERE a.id = ?
  `).get(id);
}

export function getAssignmentStudentRows(assignmentId) {
  return db.prepare(`
    SELECT s.id, s.roll_no, s.name, s.father_name,
      sas.status, sas.submitted_at, sas.remarks
    FROM students s
    LEFT JOIN student_assignment_status sas ON sas.assignment_id = ? AND sas.student_id = s.id
    WHERE s.current_batch_id = (SELECT batch_id FROM assignments WHERE id = ?) AND s.status = 'active'
    ORDER BY s.roll_no
  `).all(assignmentId, assignmentId);
}

export const createAssignment = db.transaction(({ title, description, batchId, assignedDate, dueDate, userId }) => {
  if (!title || !batchId || !assignedDate) throw new Error('Title, batch, and date required');
  const info = db.prepare(`
    INSERT INTO assignments (title, description, batch_id, assigned_date, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, description || null, batchId, assignedDate, dueDate || null, userId);
  return Number(info.lastInsertRowid);
});

export const saveAssignmentStatus = db.transaction(({ assignmentId, entries }) => {
  for (const { studentId, status, remarks } of entries) {
    if (!['pending', 'submitted', 'late', 'graded'].includes(status)) continue;
    const existing = db.prepare('SELECT id FROM student_assignment_status WHERE assignment_id = ? AND student_id = ?').get(assignmentId, studentId);
    const submittedAt = (status !== 'pending') ? new Date().toISOString() : null;
    if (existing) {
      db.prepare(`UPDATE student_assignment_status SET status = ?, submitted_at = COALESCE(?, submitted_at), remarks = ? WHERE id = ?`)
        .run(status, submittedAt, remarks || null, existing.id);
    } else {
      db.prepare(`INSERT INTO student_assignment_status (assignment_id, student_id, status, submitted_at, remarks) VALUES (?, ?, ?, ?, ?)`)
        .run(assignmentId, studentId, status, submittedAt, remarks || null);
    }
  }
});