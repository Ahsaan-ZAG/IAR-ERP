import db from '../config/database.js';

export function calcGrade(obtained, max) {
  if (!max || max <= 0) return '—';
  const p = (obtained / max) * 100;
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B';
  if (p >= 60) return 'C';
  if (p >= 50) return 'D';
  if (p >= 40) return 'E';
  return 'F';
}

export function listAssessments({ batchId, type }) {
  const cond = [], params = [];
  if (batchId) { cond.push('a.batch_id = ?'); params.push(batchId); }
  if (type) { cond.push('a.type = ?'); params.push(type); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  return db.prepare(`
    SELECT a.*, b.name AS batch_name, u.display_name AS created_by_name,
      (SELECT COUNT(*) FROM assessment_results WHERE assessment_id = a.id) AS results_count
    FROM assessments a
    JOIN batches b ON b.id = a.batch_id
    LEFT JOIN users u ON u.id = a.created_by
    ${where}
    ORDER BY a.exam_date DESC, a.id DESC
  `).all(...params);
}

export function getAssessmentById(id) {
  return db.prepare(`
    SELECT a.*, b.name AS batch_name, u.display_name AS created_by_name
    FROM assessments a
    JOIN batches b ON b.id = a.batch_id
    LEFT JOIN users u ON u.id = a.created_by
    WHERE a.id = ?
  `).get(id);
}

export function getAssessmentEntryRows(assessment) {
  return db.prepare(`
    SELECT s.id, s.roll_no, s.name, s.father_name,
      ar.obtained_marks, ar.grade, ar.remarks
    FROM students s
    LEFT JOIN assessment_results ar ON ar.assessment_id = ? AND ar.student_id = s.id
    WHERE s.current_batch_id = ? AND s.status = 'active'
    ORDER BY s.roll_no
  `).all(assessment.id, assessment.batch_id);
}

export const createAssessment = db.transaction(({ title, batchId, type, examDate, maxMarks, description, userId }) => {
  if (!title || !batchId || !examDate) throw new Error('Title, batch, and date required');
  if (!['test', 'quiz', 'midterm', 'final'].includes(type)) throw new Error('Invalid exam type');
  if (!Number.isInteger(maxMarks) || maxMarks <= 0) throw new Error('Max marks must be positive integer');
  const info = db.prepare(`
    INSERT INTO assessments (title, batch_id, type, exam_date, max_marks, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, batchId, type, examDate, maxMarks, description || null, userId);
  return Number(info.lastInsertRowid);
});

export const saveAssessmentResults = db.transaction(({ assessmentId, entries, userId }) => {
  const a = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId);
  if (!a) throw new Error('Assessment not found');
  for (const { studentId, obtainedMarks, remarks } of entries) {
    if (obtainedMarks === '' || obtainedMarks === null || obtainedMarks === undefined) {
      db.prepare('DELETE FROM assessment_results WHERE assessment_id = ? AND student_id = ?').run(assessmentId, studentId);
      continue;
    }
    const marks = parseInt(obtainedMarks, 10);
    if (isNaN(marks) || marks < 0 || marks > a.max_marks) {
      throw new Error(`Marks must be between 0 and ${a.max_marks}`);
    }
    const grade = calcGrade(marks, a.max_marks);
    const existing = db.prepare('SELECT id FROM assessment_results WHERE assessment_id = ? AND student_id = ?').get(assessmentId, studentId);
    if (existing) {
      db.prepare('UPDATE assessment_results SET obtained_marks = ?, grade = ?, remarks = ? WHERE id = ?').run(marks, grade, remarks || null, existing.id);
    } else {
      db.prepare('INSERT INTO assessment_results (assessment_id, student_id, obtained_marks, grade, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(assessmentId, studentId, marks, grade, remarks || null, userId);
    }
  }
});

export function getStudentPerformance(studentId) {
  const assessments = db.prepare(`
    SELECT a.*, ar.obtained_marks, ar.grade, ar.remarks, b.name AS batch_name
    FROM assessment_results ar
    JOIN assessments a ON a.id = ar.assessment_id
    LEFT JOIN batches b ON b.id = a.batch_id
    WHERE ar.student_id = ?
    ORDER BY a.exam_date DESC
  `).all(studentId);
  const assignments = db.prepare(`
    SELECT a.*, sas.status AS assignment_status, sas.submitted_at, sas.remarks AS status_remarks, b.name AS batch_name
    FROM student_assignment_status sas
    JOIN assignments a ON a.id = sas.assignment_id
    LEFT JOIN batches b ON b.id = a.batch_id
    WHERE sas.student_id = ?
    ORDER BY a.assigned_date DESC
  `).all(studentId);
  return { assessments, assignments };
}