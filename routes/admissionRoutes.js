import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { admissionRules, rejectExtraAdmissionFields } from '../validators/studentValidator.js';
import { showAdmissionForm, createAdmission } from '../controllers/admissionController.js';

const router = Router();

router.get('/admissions/new', requireAuth, showAdmissionForm);
router.post(
  '/admissions/new',
  requireAuth,
  rejectExtraAdmissionFields,
  admissionRules,
  createAdmission
);

export default router;