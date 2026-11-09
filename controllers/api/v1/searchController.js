import { globalSearch } from '../../../services/searchService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function search(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return sendSuccess(res, { students: [], payments: [], batches: [] }, 'Too short');
    
    const results = globalSearch(q, req.apiUser.role);
    return sendSuccess(res, results, 'Search results');
  } catch (err) { return sendError(res, 'Failed', 'INTERNAL_ERROR', 500); }
}