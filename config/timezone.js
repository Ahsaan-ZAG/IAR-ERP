export const TIMEZONE = process.env.TIMEZONE || 'Asia/Karachi';

export function todayInTimezone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function nowTimeInTimezone() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).format(new Date());
}

export function nowIsoUtc() {
  return new Date().toISOString();
}