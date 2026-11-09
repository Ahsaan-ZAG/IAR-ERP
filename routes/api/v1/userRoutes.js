import { Router } from 'express';
import { getUsers, postUser, putUser, postResetPassword } from '../../../controllers/api/v1/userController.js';
const router = Router();
router.get('/', getUsers);
router.post('/', postUser);
router.put('/:id', putUser);
router.post('/:id/reset-password', postResetPassword);
export default router;