import PDFDocument from 'pdfkit';
import db from '../config/database.js';
import { createInvoice, getInvoiceById, listInvoices } from '../services/invoiceService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone } from '../config/timezone.js';

export function index(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const search = (req.query.search || '').trim();
  const month = req.query.month || '';
  const status = req.query.status || '';

  const result = listInvoices({ month, status, search, page });

  res.render('invoices/index', {
    title: 'Invoices', user: res.locals.user, csrfToken: res.locals.csrfToken,
    invoices: result.rows, filters: { search, month, status },
    pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
    flash: res.locals.flash,
  });
}

export function showGenerateForm(req, res) {
  const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
  const students = db.prepare("SELECT id, roll_no, name FROM students WHERE status = 'active' ORDER BY roll_no").all();
  
  res.render('invoices/generate', {
    title: 'Generate Invoice', user: res.locals.user, csrfToken: res.locals.csrfToken,
    batches, students, today: todayInTimezone(),
    formErrors: {}, formData: { fee_month: todayInTimezone().slice(0, 7), target: 'single' },
    flash: res.locals.flash,
  });
}

export const postGenerate = db.transaction((req, res) => {
  const { target, student_id, batch_id, fee_month } = req.body;
  let studentIds = [];

  if (target === 'single' && student_id) {
    studentIds = [parseInt(student_id, 10)];
  } else if (target === 'batch' && batch_id) {
    const rows = db.prepare("SELECT id FROM students WHERE status = 'active' AND current_batch_id = ?").all(parseInt(batch_id, 10));
    studentIds = rows.map(r => r.id);
  } else {
    req.session.flash = { type: 'error', message: 'Please select a valid target (student or batch).' };
    return res.redirect('/invoices/generate');
  }

  let successCount = 0;
  let errors = [];

  for (const sid of studentIds) {
    try {
      createInvoice({ studentId: sid, feeMonth: fee_month, userId: req.session.user.id });
      successCount++;
    } catch (err) {
      errors.push(`Student ID ${sid}: ${err.message}`);
    }
  }

  if (successCount > 0) {
    audit(req, { action: 'invoices_generated', module: 'invoice', newValues: { count: successCount, month: fee_month } });
    req.session.flash = { type: 'success', message: `${successCount} invoice(s) generated successfully.` };
  }
  if (errors.length > 0) {
    req.session.flash = { type: 'error', message: `${errors.length} invoice(s) skipped. Details: ${errors[0]}` };
  }

  res.redirect('/invoices');
});

export function downloadPDF(req, res) {
  const inv = getInvoiceById(req.params.id);
  if (!inv) return res.status(404).send('Invoice not found');

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${inv.invoice_no}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(18).fillColor('#20212A').text('Imam Ahmed Raza Academy', { align: 'center' });
  doc.fontSize(9).fillColor('#737784').text('Under the Supervision of Barkati Foundation Trust', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(14).fillColor('#F47B20').text('MONTHLY FEE INVOICE', { align: 'center' });
  doc.moveDown(1.5);

  // Meta Info
  doc.fontSize(10).fillColor('#20212A');
  doc.text(`Invoice No:  ${inv.invoice_no}`);
  doc.text(`Month:       ${inv.fee_month}`);
  doc.text(`Date:        ${inv.created_at.slice(0, 10)}`);
  doc.moveDown(0.5);
  doc.text(`Student:     ${inv.student_name}`);
  doc.text(`Roll No:     ${inv.roll_no}`);
  doc.text(`Father:      ${inv.father_name}`);
  doc.text(`Batch:       ${inv.batch_name || '—'}`);
  doc.moveDown(1.5);

  // Table Header
  const startX = 40;
  let y = doc.y;
  doc.rect(startX, y, 515, 20).fill('#F5F6FA');
  doc.fillColor('#20212A').fontSize(9);
  doc.text('Date', startX + 5, y + 6);
  doc.text('Description', startX + 80, y + 6);
  doc.text('Amount (PKR)', startX + 420, y + 6, { width: 90, align: 'right' });
  y += 20;

  // Table Rows
  inv.transactions.forEach(t => {
    if (y > 700) { doc.addPage(); y = 40; }
    doc.fillColor('#20212A').fontSize(9);
    doc.text(t.entry_date || t.created_at.slice(0, 10), startX + 5, y + 5);
    doc.text((t.description || t.entry_type).substring(0, 60), startX + 80, y + 5, { width: 320 });
    
    const amtStr = `${t.amount > 0 ? '' : ''}${t.amount.toLocaleString()}`;
    doc.text(amtStr, startX + 420, y + 5, { width: 90, align: 'right' });
    
    doc.moveTo(startX, y + 20).lineTo(startX + 515, y + 20).stroke('#E0E2E8');
    y += 20;
  });

  // Totals
  y += 10;
  doc.fontSize(10).fillColor('#20212A');
  doc.text(`Total Charges:  PKR ${inv.total_charged.toLocaleString()}`, startX + 300, y, { width: 210, align: 'right' });
  y += 15;
  doc.text(`Total Paid:     PKR ${inv.total_paid.toLocaleString()}`, startX + 300, y, { width: 210, align: 'right' });
  y += 20;
  
  doc.fontSize(12).fillColor(inv.balance > 0 ? '#DC4545' : '#16A36A');
  doc.text(`Balance Due:    PKR ${inv.balance.toLocaleString()}`, startX + 300, y, { width: 210, align: 'right' });

  doc.fontSize(8).fillColor('#999').text(`Generated by: ${inv.generated_by_name}`, 40, 780);
  doc.end();
}
