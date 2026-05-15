import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'au_admin_session';

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

function getAdminSecret() {
  return process.env.ADMIN_PASSWORD || '';
}

function encodeBase64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signAdminSession(encodedPayload) {
  return createHmac('sha256', getAdminSecret()).update(encodedPayload).digest('base64url');
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminSessionToken({ now = Date.now() } = {}) {
  const payload = encodeBase64Url(JSON.stringify({ exp: now + (ADMIN_SESSION_TTL_SECONDS * 1000) }));
  return `${payload}.${signAdminSession(payload)}`;
}

export function verifyAdminSessionToken(token, { now = Date.now() } = {}) {
  if (!getAdminSecret() || !token) {
    return false;
  }

  const [payload, signature, extra] = String(token).split('.');
  if (!payload || !signature || extra) {
    return false;
  }

  const expectedSignature = signAdminSession(payload);
  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  try {
    const decoded = JSON.parse(decodeBase64Url(payload));
    return Number.isFinite(decoded.exp) && decoded.exp > now;
  } catch {
    return false;
  }
}

export function hasValidAdminSession(request) {
  const token = request.cookies?.get?.(ADMIN_SESSION_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function setAdminSessionCookie(response, { now = Date.now() } = {}) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: createAdminSessionToken({ now }),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    expires: new Date(now + (ADMIN_SESSION_TTL_SECONDS * 1000)),
  });

  return response;
}

export function clearAdminSessionCookie(response) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export function isAdminRequest(request) {
  return hasValidAdminSession(request);
}
