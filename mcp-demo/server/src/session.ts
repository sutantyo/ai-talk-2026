import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Ninety days, sliding. The number is a product decision, not a security
 * default: this app is carried abroad, and a session that expires in a hotel
 * with no working data connection is unrecoverable — the phrasebook keeps
 * working, but the user's other device stops receiving anything they add, and
 * they have no way to notice or fix it until they are home.
 */
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * How stale a session must be before a request refreshes it. Reissuing on
 * every single request would put a Set-Cookie on every sync — noise in every
 * response for a value that changes meaningfully once a day.
 */
export const SESSION_REISSUE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * `userId.issuedAtMs.hmac`, all base64url. Deliberately not a JWT: there is
 * one claim, one issuer, one consumer and one algorithm, and every JWT library
 * feature this would use is one more thing that can be configured wrong.
 *
 * The MAC covers the issue time as well as the user, so a client cannot extend
 * its own expiry by editing the cookie — the expiry is derived from a signed
 * value, never from an unsigned one.
 */
export function signSession(userId: string, issuedAtMs: number, secret: string): string {
  const id = Buffer.from(userId, 'utf8').toString('base64url');
  const issued = String(issuedAtMs);
  return `${id}.${issued}.${mac(`${id}.${issued}`, secret)}`;
}

export function verifySession(
  token: string | undefined,
  nowMs: number,
  secret: string
): { userId: string; issuedAtMs: number } | null {
  if (token === undefined || token === '') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, issued, presented] = parts;

  const issuedAtMs = Number(issued);
  if (!Number.isInteger(issuedAtMs)) return null;

  const expected = mac(`${id}.${issued}`, secret);
  if (!constantTimeEquals(presented, expected)) return null;

  // Checked only after the MAC, so an unsigned value never decides anything.
  if (issuedAtMs > nowMs) return null;
  if (nowMs - issuedAtMs >= SESSION_TTL_MS) return null;

  const userId = Buffer.from(id, 'base64url').toString('utf8');
  if (userId === '') return null;

  return { userId, issuedAtMs };
}

export function shouldReissue(issuedAtMs: number, nowMs: number): boolean {
  return nowMs - issuedAtMs > SESSION_REISSUE_AFTER_MS;
}

/**
 * `SameSite=Lax` rather than `Strict`: the sign-in flow returns from Google,
 * and Strict would withhold the cookie on that navigation. `Lax` still refuses
 * to send the cookie on a cross-site POST, which is the case that matters —
 * and `/api/sync` is a POST, so a cross-site form cannot drive it.
 *
 * `secure` is off only on localhost, where there is no HTTPS to be secure on.
 */
export function sessionCookieOptions(secure: boolean): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  };
}

function mac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
