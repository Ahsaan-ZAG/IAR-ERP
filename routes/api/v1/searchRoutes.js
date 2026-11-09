import { Router } from 'express';
import { search } from '../../../controllers/api/v1/searchController.js';
const router = Router();
router.get('/', search);
export default router;