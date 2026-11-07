import { body } from 'express-validator';

export const createUserRules = [
  body('username').trim().isLength({ min: 3, max: 40 }).matches(/^[a-z0-9_]+$/i).withMessage('Username: 3–40 chars, letters/digits/underscore'),
  body('display_name').trim().isLength({ min: 2, max: 80 }),
  body('password').isLength({ min: 8, max: 200 }),
  body('role').isIn(['admin', 'teacher']),
];

export const updateUserRules = [
  body('display_name').trim().isLength({ min: 2, max: 80 }),
  body('role').isIn(['admin', 'teacher']),
];

export const resetPasswordRules = [
  body('new_password').isLength({ min: 8, max: 200 }),
];