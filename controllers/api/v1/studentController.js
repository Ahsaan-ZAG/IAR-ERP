import { listStudents, getStudentById, createStudent } from '../../../services/studentService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getStudents(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const search = (req.query.search || '').trim();
    const result = listStudents({ search, batchId: null, status: 'active', page, pageSize: 20 });
    return sendSuccess(res, result.rows, 'Students retrieved', 200, {
      page: result.page, totalPages: result.totalPages, total: result.total
    });
  } catch (err) { return sendError(res, 'Failed to load', 'INTERNAL_ERROR', 500); }
}

export function getStudent(req, res) {
  try {
    const student = getStudentById(req.params.id);
    if (!student) return sendError(res, 'Not found', 'NOT_FOUND', 404);
    return sendSuccess(res, student, 'Student retrieved');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}

export function postStudent(req, res) {
  try {
    const { name, father_name } = req.body;
    if (!name || !father_name) return sendError(res, 'Name and Father Name required', 'VALIDATION_ERROR', 422);
    
    const result = createStudent({ name, fatherName: father_name, userId: req.apiUser.id });
    return sendSuccess(res, result, 'Student admitted', 201);
  } catch (err) { return sendError(res, err.message, 'INTERNAL_ERROR', 500); }
}