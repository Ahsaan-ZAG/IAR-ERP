import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  index, showStudent, postCharge, postDiscount, postAdjustment,
  showBulkForm, postBulkCharge
} from '../controllers/feeController.js';
import { chargeRules, discountRules, adjustmentRules, bulkChargeRules } from '../validators/feeValidators.js';

const router = Router();
router.get('/fees', requireAuth, index);

// Bulk route
router.get('/fees/bulk', requireAuth, showBulkForm);
router.post('/fees/bulk', requireAuth, bulkChargeRules, postBulkCharge);

router.get('/fees/student/:id', requireAuth, showStudent);
router.post('/fees/student/:id/charge', requireAuth, chargeRules, postCharge);
router.post('/fees/student/:id/discount', requireAuth, discountRules, postDiscount);
router.post('/fees/student/:id/adjustment', requireAuth, adjustmentRules, postAdjustment);
export default router;
