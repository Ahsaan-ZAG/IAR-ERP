import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { createInvoice } from '../../../services/invoiceService.js';

export function getInvoices(req, res) {
  try {
    const rows = db.prepare(`
      SELECT i.*, s.name AS student_name, s.roll_no
      FROM invoices i JOIN students s ON s.id = i.student_id
      ORDER BY i.created_at DESC LIMIT 100
    `).all();
    return sendSuccess(res, rows, 'Invoices retrieved');
  } catch (err) { 
    return sendError(res, 'Failed to load invoices', 'INTERNAL_ERROR', 500); 
  }
}

export function postInvoice(req, res) {
  try {
    const { student_id, fee_month } = req.body;
    if (!student_id || !fee_month) {
      return sendError(res, 'Student ID and Fee Month required', 'VALIDATION_ERROR', 422);
    }
    const id = createInvoice({ 
      studentId: parseInt(student_id, 10), 
      feeMonth: fee_month, 
      userId: req.apiUser.id 
    });
    return sendSuccess(res, { id }, 'Invoice generated');
  } catch (err) { 
    return sendError(res, err.message, 'INTERNAL_ERROR', 500); 
  }
}