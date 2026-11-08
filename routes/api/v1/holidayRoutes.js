import { Router } from 'express';
import { getHolidays } from '../../../controllers/api/v1/holidayController.js';
const router = Router();
router.get('/', getHolidays);
export default router;