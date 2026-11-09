import { Router } from 'express';
import { getInvoices, postInvoice } from '../../../controllers/api/v1/invoiceController.js';

const router = Router();
router.get('/', getInvoices);
router.post('/', postInvoice);

export default router;