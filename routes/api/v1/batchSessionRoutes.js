import { Router } from 'express';
import { getSessions } from '../../../controllers/api/v1/batchSessionController.js';
const router = Router();
router.get('/', getSessions);
export default router;