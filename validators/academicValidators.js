import { body } from 'express-validator';

export const assessmentRules = [
  body('title').trim().isLength({ min: 1, max: 120 }),
  body('batch_id').isInt({ min: 1 }).toInt(),
  body('type').isIn(['test', 'quiz', 'midterm', 'final']),
  body('exam_date').isDate(),
  body('max_marks').isInt({ min: 1 }).toInt(),
  body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 300 }),
];

export const courseRules = [
  body('title').trim().isLength({ min: 1, max: 120 }),
  body('batch_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).toInt(),
  body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 300 }),
];

export const topicRules = [ body('topic').trim().isLength({ min: 1, max: 200 }) ];

export const assignmentRules = [
  body('title').trim().isLength({ min: 1, max: 120 }),
  body('batch_id').isInt({ min: 1 }).toInt(),
  body('assigned_date').isDate(),
  body('due_date').optional({ nullable: true, checkFalsy: true }).isDate(),
  body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }),
];