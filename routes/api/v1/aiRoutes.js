import { Router } from 'express';
import { askAI } from '../../../controllers/api/v1/aiController.js';
const router = Router();
router.get('/ask', askAI);
export default router;