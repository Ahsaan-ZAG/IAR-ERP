import jwt from 'jsonwebtoken';
import { sendError } from '../services/api/responseService.js';

export function requireApiAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication token missing or invalid', 'UNAUTHORIZED', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    req.apiUser = decoded; // { id, role, client_type }
    next();
  } catch (err) {
    return sendError(res, 'Token expired or invalid', 'TOKEN_EXPIRED', 401);
  }
}