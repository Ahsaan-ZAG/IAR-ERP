import { Router } from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js'; // <-- Naya import

import { requireApiAuth } from '../../../middleware/apiAuth.js';
import { apiMobileReadOnly } from '../../../middleware/apiMobileReadOnly.js';
import { sendError } from '../../../services/api/responseService.js';

const router = Router();

router.use('/auth', authRoutes);

// Protected Routes
router.use(requireApiAuth);
router.use(apiMobileReadOnly); // Android block

router.use('/dashboard', dashboardRoutes); // <-- Naya route mount

router.get('/ping', (req, res) => res.json({ success: true, message: "API is working", user: req.apiUser }));

router.use((req, res) => {
  sendError(res, 'API Route not found', 'NOT_FOUND', 404);
});

export default router;
