// ... imports ...
import { getStudentMonthlySummary } from '../services/feeService.js';

export function showStudent(req, res) {
  const student = db.prepare(`
    SELECT s.*, b.name AS batch_name FROM students s
    LEFT JOIN batches b ON b.id = s.current_batch_id WHERE s.id = ?
  `).get(req.params.id);
  if (!student) return res.status(404).render('errors/404', { title: 'Not Found' });

  const balance = getStudentBalance(student.id);
  const ledger = getStudentLedger(student.id);
  const suggestedAmount = getBatchFeeAmount(student.current_batch_id) || '';
  
  // NAYA: Current year ka monthly summary nikalna
  const currentYear = new Date().getFullYear().toString();
  const monthlySummary = getStudentMonthlySummary(student.id, currentYear);

  res.render('fees/student', {
    title: `Fees — ${student.name}`,
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    student, balance, ledger, suggestedAmount,
    monthlySummary, currentYear, // pass to view
    flash: res.locals.flash,
  });
}

export function postCharge(req, res) {
  const path = `/fees/student/${req.params.id}`;
  const v = validationResult(req);
  if (!v.isEmpty()) return fail(req, res, v.array()[0].msg, path);
  try {
    addCharge({ 
      studentId: parseInt(req.params.id, 10), 
      amount: req.body.amount, 
      description: req.body.description, 
      dueDate: req.body.due_date || null, 
      feeMonth: req.body.fee_month || null, // NAYA
      userId: req.session.user.id 
    });
    // ... audit ...
  } catch (err) { req.session.flash = { type: 'error', message: err.message }; }
  res.redirect(path);
}

export function postBulkCharge(req, res) {
  // ... validation ...
  try {
    const result = addBulkCharge({
      batchId,
      amount: parseInt(amount, 10),
      description,
      dueDate: due_date || null,
      feeMonth: req.body.fee_month, // NAYA
      userId: req.session.user.id,
    });
    // ... audit ...
  } catch (err) { /* ... */ }
}
