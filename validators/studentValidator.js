import { body } from 'express-validator';

export const admissionRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Student Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Student Name must be 2–100 characters'),
  body('father_name')
    .trim()
    .notEmpty().withMessage('Father Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Father Name must be 2–100 characters'),
];

export const editStudentRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Student Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Student Name must be 2–100 characters'),
  body('father_name')
    .trim()
    .notEmpty().withMessage('Father Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Father Name must be 2–100 characters'),
  body('status')
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  body('batch_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 }).withMessage('Invalid batch'),
];

/**
 * Admission form STRICT 2 fields. Extra fields reject.
 */
export function rejectExtraAdmissionFields(req, res, next) {
  const allowed = new Set(['name', 'father_name', '_csrf']);
  const extra = Object.keys(req.body || {}).filter((k) => !allowed.has(k));
  if (extra.length > 0) {
    return res.status(400).render('admissions/new', {
      title: 'New Admission',
      csrfToken: res.locals.csrfToken,
      user: res.locals.user,
      formErrors: {
        _general: `Admission form accepts only Student Name and Father Name. Unexpected: ${extra.join(', ')}`,
      },
      formData: req.body,
    });
  }
  next();
}