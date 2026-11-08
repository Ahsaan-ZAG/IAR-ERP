import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { getStudentBalance, getStudentLedger } from '../../../services/feeService.js';
import { listPayments } from '../../../services/paymentService.js';

export function getStudentFee(req, res) {
  try {
    const studentId = parseInt(req.params.id, 10);
    const balance = getStudentBalance(studentId);
    const ledger = getStudentLedger(studentId, 100);
    return sendSuccess(res, { balance, ledger }, 'Student fees retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load fees', 'INTERNAL_ERROR', 500);
  }
}

export function getPayments(req, res) {
  try {
    const result = listPayments({ search: '', fromDate: '', toDate: '', page: 1, pageSize: 50 });
    return sendSuccess(res, result.rows, 'Payments retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load payments', 'INTERNAL_ERROR', 500);
  }
}