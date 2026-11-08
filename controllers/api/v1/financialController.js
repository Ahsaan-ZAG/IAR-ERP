import { sendSuccess, sendError } from '../../../services/api/responseService.js';
import { getDayData, getMonthlySummary } from '../../../services/financialService.js';
import { todayInTimezone } from '../../../config/timezone.js';

export function getDailyFinance(req, res) {
  try {
    const date = req.query.date || todayInTimezone();
    const data = getDayData(date);
    return sendSuccess(res, { date, ...data }, 'Daily finance retrieved');
  } catch (err) { return sendError(res, 'Failed to load', 'INTERNAL_ERROR', 500); }
}

export function getMonthlyFinance(req, res) {
  try {
    const now = new Date();
    const year = parseInt(req.query.year || now.getFullYear(), 10);
    const month = parseInt(req.query.month || now.getMonth() + 1, 10);
    const summary = getMonthlySummary(year, month);
    return sendSuccess(res, { year, month, ...summary }, 'Monthly finance retrieved');
  } catch (err) { return sendError(res, 'Failed to load', 'INTERNAL_ERROR', 500); }
}