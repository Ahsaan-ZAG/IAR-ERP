import { Router } from 'express';
import { apiLogin } from '../../../controllers/api/v1/authController.js';

const router = Router();
router.post('/login', apiLogin);

export default router;