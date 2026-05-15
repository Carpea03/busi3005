import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionToken,
  isAdminRequest,
  verifyAdminSessionToken,
} from '../lib/auth.js';

function withAdminPassword(password, run) {
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = password;

  try {
    run();
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previous;
    }
  }
}

test('admin session tokens remain valid until they expire', () => {
  withAdminPassword('session-test-secret', () => {
    const now = Date.parse('2026-05-15T10:00:00.000Z');
    const token = createAdminSessionToken({ now });

    assert.equal(verifyAdminSessionToken(token, { now: now + 1000 }), true);
    assert.equal(verifyAdminSessionToken(token, { now: now + (12 * 60 * 60 * 1000) + 1 }), false);
  });
});

test('tampered admin session tokens are rejected', () => {
  withAdminPassword('session-test-secret', () => {
    const now = Date.parse('2026-05-15T10:00:00.000Z');
    const token = createAdminSessionToken({ now });
    const [payload, signature] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ exp: now + (24 * 60 * 60 * 1000) }), 'utf8').toString('base64url');

    assert.equal(verifyAdminSessionToken(`${tamperedPayload}.${signature}`, { now }), false);
    assert.equal(verifyAdminSessionToken(`${payload}.broken-signature`, { now }), false);
  });
});

test('admin routes accept only a valid session cookie', () => {
  withAdminPassword('session-test-secret', () => {
    const token = createAdminSessionToken();
    const cookieRequest = {
      headers: new Headers(),
      url: 'https://example.test/admin/quizzes',
      cookies: {
        get(name) {
          return name === ADMIN_SESSION_COOKIE_NAME ? { value: token } : undefined;
        },
      },
    };

    const missingCookieRequest = {
      headers: new Headers(),
      url: 'https://example.test/admin/quizzes',
      cookies: {
        get() {
          return undefined;
        },
      },
    };

    assert.equal(isAdminRequest(cookieRequest), true);
    assert.equal(isAdminRequest(missingCookieRequest), false);
  });
});