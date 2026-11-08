import { listHolidays } from '../../../services/holidayService.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export function getHolidays(req, res) {
  try {
    const holidays = listHolidays({ fromDate: null, toDate: null, includeCancelled: false });
    return sendSuccess(res, holidays, 'Holidays retrieved');
  } catch (err) {
    return sendError(res, 'Failed to load holidays', 'INTERNAL_ERROR', 500);
  }
}