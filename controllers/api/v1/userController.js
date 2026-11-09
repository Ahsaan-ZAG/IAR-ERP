import { listUsers, createUser, updateUser, resetPassword } from '../../../services/userService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getUsers(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    return sendSuccess(res, listUsers(), 'Users list');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}

export async function postUser(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    const id = await createUser({ ...req.body, role: req.body.role || 'teacher' });
    return sendSuccess(res, { id }, 'User created');
  } catch (err) { return sendError(res, err.message, 'INTERNAL_ERROR', 500); }
}

export async function putUser(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    updateUser({ userId: parseInt(req.params.id, 10), ...req.body });
    return sendSuccess(res, null, 'User updated');
  } catch (err) { return sendError(res, err.message, 'INTERNAL_ERROR', 500); }
}

export async function postResetPassword(req, res) {
  if (req.apiUser.role !== 'admin') return sendError(res, 'Admin only', 'FORBIDDEN', 403);
  try {
    await resetPassword({ userId: parseInt(req.params.id, 10), newPassword: req.body.new_password });
    return sendSuccess(res, null, 'Password reset');
  } catch (err) { return sendError(res, err.message, 'INTERNAL_ERROR', 500); }
}