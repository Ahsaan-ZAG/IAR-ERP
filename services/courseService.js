import db from '../config/database.js';

export function listCourses({ batchId }) {
  const cond = ['c.is_active = 1'];
  const params = [];
  if (batchId) { cond.push('c.batch_id = ?'); params.push(batchId); }
  return db.prepare(`
    SELECT c.*, b.name AS batch_name,
      (SELECT COUNT(*) FROM syllabus_topics WHERE course_id = c.id) AS total_topics,
      (SELECT COUNT(*) FROM syllabus_topics WHERE course_id = c.id AND is_completed = 1) AS completed_topics
    FROM courses c
    LEFT JOIN batches b ON b.id = c.batch_id
    WHERE ${cond.join(' AND ')}
    ORDER BY c.id DESC
  `).all(...params);
}

export function getCourseById(id) {
  const c = db.prepare(`
    SELECT c.*, b.name AS batch_name
    FROM courses c LEFT JOIN batches b ON b.id = c.batch_id WHERE c.id = ?
  `).get(id);
  if (!c) return null;
  c.topics = db.prepare(`SELECT * FROM syllabus_topics WHERE course_id = ? ORDER BY id`).all(id);
  c.total = c.topics.length;
  c.completed = c.topics.filter(t => t.is_completed).length;
  c.progress = c.total ? Math.round((c.completed / c.total) * 100) : 0;
  return c;
}

export const createCourse = db.transaction(({ title, batchId, description }) => {
  if (!title) throw new Error('Title required');
  const info = db.prepare(`INSERT INTO courses (title, batch_id, description) VALUES (?, ?, ?)`)
    .run(title, batchId || null, description || null);
  return Number(info.lastInsertRowid);
});

export const addTopic = db.transaction(({ courseId, topic }) => {
  if (!topic) throw new Error('Topic required');
  const info = db.prepare(`INSERT INTO syllabus_topics (course_id, topic) VALUES (?, ?)`).run(courseId, topic);
  return Number(info.lastInsertRowid);
});

export const toggleTopic = db.transaction(({ topicId }) => {
  const t = db.prepare('SELECT * FROM syllabus_topics WHERE id = ?').get(topicId);
  if (!t) throw new Error('Topic not found');
  if (t.is_completed) {
    db.prepare('UPDATE syllabus_topics SET is_completed = 0, completed_at = NULL WHERE id = ?').run(topicId);
  } else {
    db.prepare(`UPDATE syllabus_topics SET is_completed = 1, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(topicId);
  }
  return t.course_id;
});