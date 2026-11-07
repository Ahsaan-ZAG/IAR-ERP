export const TIMEZONE = process.env.TIMEZONE || 'Asia/Karachi';

export function todayInTimezone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function nowIsoUtc() {
  return new Date().toISOString();
}