import { body } from 'express-validator';

const methods = ['cash', 'bank', 'easypaisa', 'jazzcash', 'cheque'];

export const chargeRules = [
  body('amount').isInt({ min: 1 }).toInt().withMessage('Amount must be a positive integer'),
  body('description').trim().isLength({ min: 1, max: 200 }),
  body('due_date').optional({ nullable: true, checkFalsy: true }).isDate(),
];

export const discountRules = [
  body('amount').isInt({ min: 1 }).toInt().withMessage('Amount must be a positive integer'),
  body('description').trim().isLength({ min: 1, max: 200 }),
];

export const adjustmentRules = [
  body('direction').isIn(['add', 'subtract']),
  body('amount').isInt({ min: 1 }).toInt().withMessage('Amount must be a positive integer'),
  body('description').trim().isLength({ min: 1, max: 200 }),
];

export const paymentRules = [
  body('student_id').isInt({ min: 1 }).toInt(),
  body('amount').isInt({ min: 1 }).toInt().withMessage('Amount must be a positive integer'),
  body('method').isIn(methods),
  body('notes').optional({ nullable: true, checkFalsy: true }).isLength({ max: 200 }),
];

export const reverseRules = [
  body('reason').trim().isLength({ min: 3, max: 300 }),
];

export const expenseRules = [
  body('category').trim().isLength({ min: 1, max: 50 }),
  body('amount').isInt({ min: 1 }).toInt(),
  body('expense_date').isDate(),
  body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 200 }),
];