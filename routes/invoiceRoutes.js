import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { index, showGenerateForm, postGenerate, downloadPDF } from '../controllers/invoiceController.js';

const router = Router();
router.get('/invoices', requireAuth, index);
router.get('/invoices/generate', requireAuth, showGenerateForm);
router.post('/invoices/generate', requireAuth, postGenerate);
router.get('/invoices/:id/pdf', requireAuth, downloadPDF);

export default router;
