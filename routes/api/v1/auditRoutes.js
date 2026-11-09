import { Router } from 'express';
import { getAuditLogs } from '../../../controllers/api/v1/auditController.js';
const router = Router();
router.get('/', getAuditLogs);
export default router;