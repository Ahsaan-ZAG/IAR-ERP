import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { listPayments, createPayment } from '../../../services/paymentService.js';

export function getPayments(req, res) {
  try {
    const result = listPayments({ search: '', fromDate: '', toDate: '', page: 1, pageSize: 50 });
    return sendSuccess(res, result.rows, 'Payments retrieved');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}

export function postPayment(req, res) {
  try {
    const { student_id, amount, method, fee_month } = req.body;
    if (!student_id || !amount || !method) return sendError(res, 'Missing data', 'VALIDATION_ERROR', 422);
    
    const result = createPayment({ studentId: student_id, amount, method, feeMonth: fee_month, userId: req.apiUser.id });
    return sendSuccess(res, result, 'Payment received');
  } catch (err) { return sendError(res, err.message, 'INTERNAL_ERROR', 500); }
}