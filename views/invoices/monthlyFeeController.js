import db from '../config/database.js';
import { createPayment } from '../services/paymentService.js';
import { audit } from '../services/auditService.js';
import { todayInTimezone } from '../config/timezone.js';

export function index(req, res) {
  const month = req.query.month || todayInTimezone().slice(0, 7); // Default current month

  // Fetch all active students and their fee status for the selected month
  const students = db.prepare(`
    SELECT s.id, s.roll_no, s.name, s.father_name, b.name AS batch_name,
           COALESCE(SUM(CASE WHEN l.entry_type = 'charge' THEN l.amount ELSE 0 END), 0) AS total_charged,
           COALESCE(SUM(CASE WHEN l.entry_type IN ('payment', 'discount') THEN l.amount ELSE 0 END), 0) AS total_paid
    FROM students s
    LEFT JOIN batches b ON b.id = s.current_batch_id
    LEFT JOIN student_fee_ledger l ON l.student_id = s.id AND l.fee_month = ?
    WHERE s.status = 'active'
    GROUP BY s.id
    ORDER BY s.roll_no
  `).all(month);

  const feeRecords = students.map(s => {
    // Agar charge nahi laga to default 200 maan lein (sirf display ke liye)
    const charged = s.total_charged === 0 ? 200 : s.total_charged;
    const paid = Math.abs(s.total_paid);
    const balance = charged - paid;
    
    let status = 'unpaid';
    if (balance <= 0) status = 'paid';
    else if (paid > 0) status = 'partial';

    return { ...s, display_charged: charged, display_paid: paid, display_balance: balance, status };
  });

  res.render('monthly-fees/index', {
    title: 'Monthly Fee Register',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    month,
    feeRecords,
    flash: res.locals.flash,
  });
}

export function collectFee(req, res) {
  const { student_id, month, amount, method } = req.body;
  const studentId = parseInt(student_id, 10);
  const feeAmount = parseInt(amount, 10);

  try {
    // 1. Check if charge exists for this month. If not, add 200 (or the collected amount).
    const chargeExists = db.prepare("SELECT id FROM student_fee_ledger WHERE student_id = ? AND fee_month = ? AND entry_type = 'charge'").get(studentId, month);
    if (!chargeExists) {
      db.prepare(`
        INSERT INTO student_fee_ledger (student_id, entry_type, amount, description, fee_month, entry_date, created_by)
        VALUES (?, 'charge', ?, 'Monthly Fee', ?, ?, ?)
      `).run(studentId, 200, month, todayInTimezone(), req.session.user.id);
    }

    // 2. Record the payment
    const { receiptNo } = createPayment({
      studentId,
      amount: feeAmount,
      method: method || 'cash',
      notes: `Monthly Fee for ${month}`,
      feeMonth: month,
      userId: req.session.user.id,
    });

    audit(req, { 
      action: 'monthly_fee_collected', module: 'fee', recordId: studentId, 
      newValues: { month, amount: feeAmount, receipt: receiptNo } 
    });

    req.session.flash = { type: 'success', message: `Fee collected for student. Receipt: ${receiptNo}` };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }

  res.redirect(`/monthly-fees?month=${month}`);
}
