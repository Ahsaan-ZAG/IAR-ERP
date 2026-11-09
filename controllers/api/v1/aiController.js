import { answerQuestion } from '../../../services/aiService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export async function askAI(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return sendError(res, 'Empty question', 'VALIDATION_ERROR', 422);
    if (q.length > 500) return sendError(res, 'Question too long', 'VALIDATION_ERROR', 422);
    
    const answer = await answerQuestion(q);
    return sendSuccess(res, answer, 'AI Answer');
  } catch (err) { return sendError(res, 'AI Failed', 'INTERNAL_ERROR', 500); }
}