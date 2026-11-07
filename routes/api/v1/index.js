import { Router } from 'express';
import authRoutes from './authRoutes.js';
// Baqi routes (students, fees) yahan aage add honge
import { requireApiAuth } from '../../../middleware/apiAuth.js';
import { apiMobileReadOnly } from '../../../middleware/apiMobileReadOnly.js';
import { sendError } from '../../../services/api/responseService.js';

const router = Router();

// 1. Public Routes
router.use('/auth', authRoutes);

// 2. Protected Routes (JWT Lazmi hai)
router.use(requireApiAuth);

// 3. Android Read-Only Enforcement (Sab protected routes par lagega)
router.use(apiMobileReadOnly);

// 4. Module Routes (Yahan aage add karenge)
router.get('/ping', (req, res) => res.json({ success: true, message: "API is working", user: req.apiUser }));

// 5. 404 Fallback for API
router.use((req, res) => {
  sendError(res, 'API Route not found', 'NOT_FOUND', 404);
});

export default router;