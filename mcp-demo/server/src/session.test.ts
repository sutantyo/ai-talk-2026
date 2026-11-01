import { describe, it, expect } from 'vitest';
import {
  signSession,
  verifySession,
  shouldReissue,
  sessionCookieOptions,
  SESSION_TTL_MS,
  SESSION_REISSUE_AFTER_MS
} from './session';

const SECRET = 'x'.repeat(32);
const OTHER = 'y'.repeat(32);
const T0 = 1_785_000_000_000;
const USER = 'c0ffee00-0000-4000-8000-000000000001';

describe('signSession / verifySession', () => {
  it('round-trips a user id', () => {
    expect(verifySession(signSession(USER, T0, SECRET), T0 + 1000, SECRET)).toEqual({
      userId: USER,
      issuedAtMs: T0
    });
  });

  it('rejects an absent cookie', () => {
    expect(verifySession(undefined, T0, SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    expect(verifySession(signSession(USER, T0, OTHER), T0, SECRET)).toBeNull();
  });

  it('rejects a tampered user id', () => {
    const token = signSession(USER, T0, SECRET);
    const [, issued, mac] = token.split('.');
    const forged = [Buffer.from('attacker').toString('base64url'), issued, mac].join('.');
    expect(verifySession(forged, T0, SECRET)).toBeNull();
  });

  it('rejects a tampered issue time, which is what stops an expiry being extended', () => {
    const token = signSession(USER, T0, SECRET);
    const [id, , mac] = token.split('.');
    const forged = [id, String(T0 + SESSION_TTL_MS), mac].join('.');
    expect(verifySession(forged, T0 + SESSION_TTL_MS, SECRET)).toBeNull();
  });

  it('rejects a malformed token without throwing', () => {
    expect(verifySession('', T0, SECRET)).toBeNull();
    expect(verifySession('not-a-token', T0, SECRET)).toBeNull();
    expect(verifySession('a.b', T0, SECRET)).toBeNull();
    expect(verifySession('a.b.c.d', T0, SECRET)).toBeNull();
    expect(verifySession('a.notanumber.c', T0, SECRET)).toBeNull();
  });

  it('rejects a structurally valid token whose MAC segment is the wrong length, without throwing', () => {
    // Three dot-separated parts and a numeric middle segment — so this clears
    // every earlier-returning check (shape, integer `issued`) and actually
    // reaches the MAC comparison. The real MAC is a 43-character base64url
    // SHA-256 digest; `x` is one character. `crypto.timingSafeEqual` throws on
    // a buffer-length mismatch, so a naive comparison here turns an
    // unauthenticated, malformed cookie into a 500 instead of a `null`. See
    // constantTimeEquals's length guard, which exists specifically to make
    // this a rejection rather than a crash.
    const id = Buffer.from(USER, 'utf8').toString('base64url');
    const forged = `${id}.${T0}.x`;
    expect(verifySession(forged, T0, SECRET)).toBeNull();
  });

  it('accepts a session one millisecond before ninety days', () => {
    const token = signSession(USER, T0, SECRET);
    expect(verifySession(token, T0 + SESSION_TTL_MS - 1, SECRET)).not.toBeNull();
  });

  it('rejects a session at exactly ninety days', () => {
    const token = signSession(USER, T0, SECRET);
    expect(verifySession(token, T0 + SESSION_TTL_MS, SECRET)).toBeNull();
  });

  it('rejects a token from the future', () => {
    expect(verifySession(signSession(USER, T0, SECRET), T0 - 60_000, SECRET)).toBeNull();
  });

  it('is ninety days, because being logged out mid-trip is unrecoverable offline', () => {
    expect(SESSION_TTL_MS).toBe(90 * 24 * 60 * 60 * 1000);
  });
});

describe('shouldReissue', () => {
  it('does not reissue on a request moments after sign-in', () => {
    expect(shouldReissue(T0, T0 + 1000)).toBe(false);
  });

  it('reissues once the session is more than a day old', () => {
    expect(shouldReissue(T0, T0 + SESSION_REISSUE_AFTER_MS + 1)).toBe(true);
  });

  it('slides: a session used on day 89 is good for another ninety days', () => {
    const day89 = T0 + 89 * 24 * 60 * 60 * 1000;
    expect(shouldReissue(T0, day89)).toBe(true);
    const renewed = signSession(USER, day89, SECRET);
    expect(verifySession(renewed, day89 + SESSION_TTL_MS - 1, SECRET)).not.toBeNull();
  });
});

describe('sessionCookieOptions', () => {
  it('sets maxAge to ninety days in seconds, not milliseconds', () => {
    // Pinned to the literal number, not derived from SESSION_TTL_MS by the
    // same arithmetic the implementation uses — a division-by-1000 typo (or
    // its absence) in sessionCookieOptions would still satisfy an assertion
    // written as SESSION_TTL_MS / 1000. 7_776_000 seconds is 90 days; shipping
    // SESSION_TTL_MS unconverted (90 * 24 * 60 * 60 * 1000, i.e. 7_776_000_000)
    // would set a cookie with a thousand-times-too-long lifetime while every
    // other test in this file — which only ever exercises milliseconds —
    // stays green.
    expect(sessionCookieOptions(false).maxAge).toBe(7_776_000);
  });

  it('carries the httpOnly, sameSite, and path attributes unconditionally', () => {
    expect(sessionCookieOptions(false)).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    });
  });

  it('threads the secure flag through unchanged in both directions', () => {
    expect(sessionCookieOptions(true).secure).toBe(true);
    expect(sessionCookieOptions(false).secure).toBe(false);
  });
});
