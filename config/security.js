import { doubleCsrf } from 'csrf-csrf';

const isProd = process.env.NODE_ENV === 'production';

export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'dev-csrf-secret-change-me',

  // v4 mein ye REQUIRED hai. Session ke andar ek stable csrfId use karte hain.
  getSessionIdentifier: (req) => req.session.csrfId,

  cookieName: isProd ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: isProd,
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],

  // v4 mein naam getTokenFromRequest se getCsrfTokenFromRequest ho gaya hai.
  // Docs ke mutabiq header aur body ko explicitly handle karein (fallthrough na karein).
  getCsrfTokenFromRequest: (req) => {
    if (req.headers['x-csrf-token']) return req.headers['x-csrf-token'];
    if (req.body && typeof req.body._csrf === 'string') return req.body._csrf;
    return undefined;
  },
});