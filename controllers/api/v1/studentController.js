import { listStudents, getStudentById } from '../../../services/studentService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getStudents(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const search = (req.query.search || '').trim();
    const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
    const status = req.query.status || 'active';

    const result = listStudents({ search, batchId, status, page, pageSize: 20 });
    
    return sendSuccess(res, result.rows, 'Students retrieved', 200, {
      page: result.page,
      totalPages: result.totalPages,
      total: result.total
    });
  } catch (err) {
    console.error('API Students Error:', err);
    return sendError(res, 'Failed to load students', 'INTERNAL_ERROR', 500);
  }
}

export function getStudent(req, res) {
  try {
    const student = getStudentById(req.params.id);
    if (!student) return sendError(res, 'Student not found', 'NOT_FOUND', 404);
    
    return sendSuccess(res, student, 'Student details retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load student', 'INTERNAL_ERROR', 500);
  }
}