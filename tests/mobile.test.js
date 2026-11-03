import test from 'node:test';
import assert from 'node:assert/strict';
import { mobileReadOnly } from '../middleware/mobileReadOnly.js';

function callMiddleware(method, path, session, headers = {}) {
  const req = {
    method, path, session, headers: { accept: 'text/html', ...headers },
    xhr: false,
    get: (h) => headers[h.toLowerCase()],
    ip: '127.0.0.1',
  };
  let status = null;
  let body = null;
  let nextCalled = false;

  const res = {
    status(s) { status = s; return this; },
    json(b) { body = b; return this; },
    render() { body = 'html'; return this; },
    setHeader() {},
  };

  mobileReadOnly(req, res, () => { nextCalled = true; });

  return { nextCalled, status, body };
}

test('desktop session POST allowed', () => {
  const r = callMiddleware('POST', '/holidays/new', { access_mode: 'desktop' });
  assert.equal(r.nextCalled, true);
});

test('mobile session POST blocked with 403', () => {
  const r = callMiddleware(
    'POST', '/holidays/new',
    { access_mode: 'mobile_readonly' },
    { accept: 'application/json' }
  );
  assert.equal(r.nextCalled, false);
  assert.equal(r.status, 403);
});

test('mobile session GET allowed', () => {
  const r = callMiddleware('GET', '/mobile/dashboard', { access_mode: 'mobile_readonly' });
  assert.equal(r.nextCalled, true);
});

test('mobile session logout always allowed', () => {
  const r = callMiddleware('POST', '/auth/logout', { access_mode: 'mobile_readonly' });
  assert.equal(r.nextCalled, true);
});