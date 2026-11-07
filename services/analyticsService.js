const PY_URL = process.env.PY_ANALYTICS_URL || 'http://127.0.0.1:8001';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-in-production';

export const ALLOWED_CHARTS = Object.freeze([
  'fee-monthly',
  'expenses-monthly',
  'income-vs-expense',
  'attendance-trend',
  'batch-attendance',
  'student-performance',
  'batch-completion',
  'outstanding',
  'student-growth',
  'teacher-attendance',
  'admission-trend',
  'financial-trend',
]);

const PARAM_WHITELIST = {
  'fee-monthly': ['months'],
  'expenses-monthly': ['months'],
  'income-vs-expense': ['months'],
  'financial-trend': ['months'],
  'student-growth': ['months'],
  'admission-trend': ['months'],
  'attendance-trend': ['days'],
  'batch-attendance': ['days'],
  'teacher-attendance': ['days'],
  'student-performance': ['student_id'],
};

export function isAllowedChart(name) {
  return ALLOWED_CHARTS.includes(name);
}

export function sanitizeParams(name, query) {
  const allowed = PARAM_WHITELIST[name] || [];
  const out = {};
  for (const key of allowed) {
    const raw = query?.[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const num = parseInt(raw, 10);
    if (!Number.isFinite(num)) continue;
    out[key] = num;
  }
  return out;
}

export async function fetchChart(name, params = {}) {
  if (!isAllowedChart(name)) throw new Error('Unknown chart');

  const qs = new URLSearchParams(params).toString();
  const url = `${PY_URL}/charts/${name}${qs ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      headers: { 'X-Internal-Key': INTERNAL_KEY },
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Analytics service ${response.status}: ${detail.slice(0, 200)}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      contentType: response.headers.get('content-type') || 'image/png',
      buffer,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyticsHealth() {
  try {
    const response = await fetch(`${PY_URL}/health`, {
      headers: { 'X-Internal-Key': INTERNAL_KEY },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}