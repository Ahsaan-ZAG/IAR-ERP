import db from '../config/database.js';
import { createPayment } from '../services/paymentService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone } from '../config/timezone.js';

export function index(req, res) {
  // Database se active students laayen
  const students = db.prepare(`
    SELECT s.id, s.roll_no, s.name, s.father_name, b.name AS batch_name
    FROM students s
    LEFT JOIN batches b ON b.id = s.current_batch_id
    WHERE s.status = 'active'
    ORDER BY s.roll_no
  `).all();

  // Recent collections (last 20) dikhane ke liye
  const recentCollections = db.prepare(`
    SELECT p.id, p.receipt_no, p.amount, p.payment_date, p.method,
           s.name AS student_name, s.roll_no,
           l.fee_month
    FROM payments p
    JOIN students s ON s.id = p.student_id
    LEFT JOIN student_fee_ledger l ON l.id = p.ledger_id
    WHERE l.fee_month IS NOT NULL
    ORDER BY p.created_at DESC
    LIMIT 20
  `).all();

  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  res.render('monthly-fees/index', {
    title: 'Fee Collection',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    students,
    recentCollections,
    currentYear,
    currentMonth,
    today: todayInTimezone(),
    flash: res.locals.flash,
  });
}

export function collectFee(req, res) {
  const { student_id, year, month, amount, method } = req.body;
  
  const studentId = parseInt(student_id, 10);
  const feeAmount = parseInt(amount, 10);
  
  // fee_month format: "2026-11"
  const feeMonth = `${year}-${String(month).padStart(2, '0')}`;

  try {
    if (!studentId || !feeAmount || feeAmount <= 0) {
      throw new Error('Please fill all required fields correctly.');
    }

    // 1. Check if charge exists for this month. If not, add it (default 200)
    const chargeExists = db.prepare(`
      SELECT id FROM student_fee_ledger 
      WHERE student_id = ? AND fee_month = ? AND entry_type = 'charge'
    `).get(studentId, feeMonth);

    if (!chargeExists) {
      db.prepare(`
        INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, fee_month, entry_date, created_by)
        VALUES (?, 'charge', ?, 'Monthly Fee', ?, ?, ?)
      `).run(studentId, 200, feeMonth, todayInTimezone(), req.session.user.id);
    }

    // 2. Record the payment
    const { receiptNo, paymentId } = createPayment({
      studentId,
      amount: feeAmount,
      method: method || 'cash',
      notes: `Monthly Fee — ${feeMonth}`,
      feeMonth: feeMonth,
      userId: req.session.user.id,
    });

    // 3. Audit log
    audit(req, {
      action: 'monthly_fee_collected',
      module: 'fee',
      recordId: studentId,
      newValues: { fee_month: feeMonth, amount: feeAmount, receipt: receiptNo },
    });

    req.session.flash = {
      type: 'success',
      message: `✓ Fee collected! Receipt: ${receiptNo} — Amount: PKR ${feeAmount.toLocaleString()} for ${feeMonth}`,
    };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }

  res.redirect('/monthly-fees');
}
