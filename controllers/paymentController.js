import { validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import { createPayment, reversePayment, getPaymentById, listPayments } from '../services/paymentService.js';
import { audit } from '../services/auditService.js';
import { notifyAdmins } from '../services/notificationService.js';

export function index(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const search = (req.query.search || '').trim();
  const result = listPayments({
    search,
    fromDate: req.query.from || '',
    toDate: req.query.to || '',
    page,
  });
  res.render('payments/index', {
    title: 'Payments',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    payments: result.rows,
    filters: { search, from: req.query.from || '', to: req.query.to || '' },
    pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
    flash: res.locals.flash,
  });
}

export function show(req, res) {
  const payment = getPaymentById(req.params.id);
  if (!payment) return res.status(404).render('errors/404', { title: 'Not Found' });
  res.render('payments/show', {
    title: `Receipt ${payment.receipt_no}`,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    payment,
    isAdmin: req.session.user.role === 'admin',
    flash: res.locals.flash,
  });
}

export function postReceive(req, res) {
  const v = validationResult(req);
  if (!v.isEmpty()) {
    req.session.flash = { type: 'error', message: v.array()[0].msg };
    return res.redirect(req.get('referer') || '/fees');
  }
  try {
    const { paymentId, receiptNo } = createPayment({
      studentId: req.body.student_id,
      amount: req.body.amount,
      method: req.body.method,
      notes: req.body.notes,
      userId: req.session.user.id,
    });
    audit(req, {
      action: 'payment_received', module: 'payment', recordId: paymentId,
      newValues: { receipt_no: receiptNo, ...req.body },
    });
    notifyAdmins({
      type: 'payment',
      message: `Payment PKR ${req.body.amount} received (${receiptNo})`,
      referenceType: 'payment',
      referenceId: paymentId,
    });
    req.session.flash = { type: 'success', message: `Payment received. Receipt: ${receiptNo}` };
    res.redirect(`/payments/${paymentId}`);
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect(req.get('referer') || '/fees');
  }
}

export function postReverse(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Only admin can reverse payments.' };
    return res.redirect(`/payments/${req.params.id}`);
  }
  const v = validationResult(req);
  if (!v.isEmpty()) {
    req.session.flash = { type: 'error', message: v.array()[0].msg };
    return res.redirect(`/payments/${req.params.id}`);
  }
  try {
    const p = reversePayment({
      paymentId: parseInt(req.params.id, 10),
      reason: req.body.reason,
      userId: req.session.user.id,
    });
    audit(req, {
      action: 'payment_reversed', module: 'payment', recordId: p.id,
      newValues: { reason: req.body.reason, original_amount: p.amount },
    });
    req.session.flash = { type: 'success', message: 'Payment reversed. Ledger adjusted.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect(`/payments/${req.params.id}`);
}

export function downloadReceipt(req, res) {
  const p = getPaymentById(req.params.id);
  if (!p) return res.status(404).send('Not found');
  const doc = new PDFDocument({ size: 'A5', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${p.receipt_no}.pdf"`);
  doc.pipe(res);
  doc.fontSize(16).fillColor('#20212A').text('Imam Ahmed Raza Academy', { align: 'center' });
  doc.fontSize(8).fillColor('#737784')
    .text('Under the Supervision of Barkati Foundation Trust', { align: 'center' });
  doc.moveDown(0.6);
  doc.fontSize(13).fillColor('#F47B20').text('PAYMENT RECEIPT', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).fillColor('#20212A');
  doc.text(`Receipt No:  ${p.receipt_no}`);
  doc.text(`Date:        ${p.payment_date}`);
  doc.moveDown(0.5);
  doc.text(`Student:     ${p.name}`);
  doc.text(`Roll No:     ${p.roll_no}`);
  doc.text(`Father:      ${p.father_name}`);
  doc.moveDown(1);
  doc.fontSize(13).fillColor('#16A36A').text(`Amount: PKR ${p.amount.toLocaleString()}`);
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#20212A');
  doc.text(`Method:      ${p.method.charAt(0).toUpperCase() + p.method.slice(1)}`);
  doc.text(`Received By: ${p.received_by_name || '—'}`);
  doc.moveDown(1);
  if (p.is_reversed) {
    doc.fontSize(11).fillColor('#DC4545')
      .text('*** THIS PAYMENT HAS BEEN REVERSED ***', { align: 'center' });
    doc.fontSize(9).fillColor('#737784')
      .text(`Reason: ${p.reversal_reason || ''}`, { align: 'center' });
  }
  doc.fontSize(7).fillColor('#999')
    .text('This is a payment receipt, not an invoice.', { align: 'center' });
  doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
  doc.end();
}