import { doubleCsrf } from 'csrf-csrf';

const isProd = process.env.NODE_ENV === 'production';

export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'dev-csrf-secret-change-me',
  getSessionIdentifier: (req) => req.session.csrfId,
  cookieName: isProd ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token',
  cookieOptions: { sameSite: 'lax', path: '/', secure: isProd, httpOnly: true },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => {
    if (req.headers['x-csrf-token']) return req.headers['x-csrf-token'];
    if (req.query && typeof req.query._csrf === 'string') return req.query._csrf; // <-- NAYA: Upload forms ke liye
    if (req.body && typeof req.body._csrf === 'string') return req.body._csrf;
    return undefined;
  },
});