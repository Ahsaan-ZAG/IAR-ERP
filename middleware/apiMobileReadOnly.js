import { sendError } from '../services/api/responseService.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function apiMobileReadOnly(req, res, next) {
  // Agar user ka client_type android hai aur method write hai, to block karo
  if (req.apiUser?.client_type === 'android' && WRITE_METHODS.has(req.method)) {
    return sendError(
      res, 
      'Android API is strictly read-only. This action is not permitted.', 
      'FORBIDDEN_MOBILE_WRITE', 
      403
    );
  }
  next();
}