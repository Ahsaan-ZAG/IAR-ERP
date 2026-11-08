import { Router } from 'express';
import { getBatches, getBatch } from '../../../controllers/api/v1/batchController.js';
const router = Router();
router.get('/', getBatches);
router.get('/:id', getBatch);
export default router;