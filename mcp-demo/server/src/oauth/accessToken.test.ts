import { describe, it, expect } from 'vitest';
import {
  ACCESS_TOKEN_TTL_MS,
  signAccessToken,
  verifyAccessToken
} from './accessToken';
import { signSession } from '../session';

const SECRET = 'z'.repeat(32);
const OTHER = 'q'.repeat(32);
const T0 = 1_785_000_000_000;
const USER = 'c0ffee00-0000-4000-8000-000000000001';
const AUDIENCE = 'https://phrases.example.com/mcp';
const SCOPE = 'library.read library.write';

const issue = (over: Partial<Parameters<typeof signAccessToken>[0]> = {}) =>
  signAccessToken(
    { subject: USER, audience: AUDIENCE, scope: SCOPE, issuedAtMs: T0, ...over },
    SECRET
  );

const check = (token: string | undefined, over: { audience?: string; nowMs?: number; secret?: string } = {}) =>
  verifyAccessToken(token, {
    audience: over.audience ?? AUDIENCE,
    nowMs: over.nowMs ?? T0 + 1000,
    secret: over.secret ?? SECRET
  });

describe('signAccessToken / verifyAccessToken', () => {
  it('round-trips the subject and the granted scope', () => {
    expect(check(issue())).toEqual({
      subject: USER,
      scope: SCOPE,
      issuedAtMs: T0,
      expiresAtMs: T0 + ACCESS_TOKEN_TTL_MS
    });
  });

  it('lasts one hour', () => {
    // Pinned to the literal, not derived from the constant by the same
    // arithmetic the implementation uses: an hour stated in seconds, or a
    // dropped multiplication, would still satisfy an assertion written as
    // `ACCESS_TOKEN_TTL_MS`.
    expect(ACCESS_TOKEN_TTL_MS).toBe(3_600_000);
  });

  it('accepts a token one millisecond before it expires', () => {
    expect(check(issue(), { nowMs: T0 + ACCESS_TOKEN_TTL_MS - 1 })).not.toBeNull();
  });

  it('rejects a token at exactly its expiry', () => {
    expect(check(issue(), { nowMs: T0 + ACCESS_TOKEN_TTL_MS })).toBeNull();
  });

  it('rejects a token issued in the future', () => {
    expect(check(issue(), { nowMs: T0 - 60_000 })).toBeNull();
  });

  /*
    THE PROPERTY THE RESOURCE SERVER RIDES ON. A token minted for a different
    audience must not open this one. Without the check, a token issued by this
    same authorization server for some other resource — or one phished into
    existence for an attacker's own connector URL — would be accepted here,
    because it carries a valid signature from the right key.
  */
  it('rejects a token whose audience is not the resource asking', () => {
    expect(check(issue(), { audience: 'https://phrases.example.com/other' })).toBeNull();
    expect(check(issue({ audience: 'https://evil.example/mcp' }))).toBeNull();
  });

  it('is strict about the audience rather than prefix-matching it', () => {
    expect(check(issue(), { audience: 'https://phrases.example.com/mcp/extra' })).toBeNull();
    expect(check(issue(), { audience: 'https://phrases.example.com' })).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    expect(check(issue(), { secret: OTHER })).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const [payload, mac] = issue().split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const forged = Buffer.from(
      JSON.stringify({ ...decoded, sub: 'somebody-else' }),
      'utf8'
    ).toString('base64url');
    expect(check(`${forged}.${mac}`)).toBeNull();
  });

  it('rejects an extended expiry, which is what signing the expiry prevents', () => {
    // The MAC covers the expiry, so a client cannot grant itself a longer
    // token by editing one — the same discipline as session.ts signing its
    // issue time.
    const [payload, mac] = issue().split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const forged = Buffer.from(
      JSON.stringify({ ...decoded, exp: T0 + 400 * 24 * 60 * 60 * 1000 }),
      'utf8'
    ).toString('base64url');
    expect(check(`${forged}.${mac}`, { nowMs: T0 + ACCESS_TOKEN_TTL_MS + 1 })).toBeNull();
  });

  it('rejects an escalated scope', () => {
    const [payload, mac] = issue({ scope: 'library.read' }).split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const forged = Buffer.from(
      JSON.stringify({ ...decoded, scope: 'library.read library.write' }),
      'utf8'
    ).toString('base64url');
    expect(check(`${forged}.${mac}`)).toBeNull();
  });

  it('rejects malformed input without throwing', () => {
    expect(check(undefined)).toBeNull();
    expect(check('')).toBeNull();
    expect(check('not-a-token')).toBeNull();
    expect(check('a.b.c')).toBeNull();
    expect(check('a.b.c.d')).toBeNull();
  });

  it('rejects a MAC segment of the wrong length without throwing', () => {
    // `timingSafeEqual` throws on a length mismatch, so a comparison with no
    // length guard turns an unauthenticated malformed bearer token into a 500.
    const [payload] = issue().split('.');
    expect(check(`${payload}.x`)).toBeNull();
  });
});

/*
  ACCESS TOKENS AND SESSION COOKIES SHARE A SECRET AND MUST NOT SHARE ANYTHING
  ELSE.

  The design says to reuse session.ts's HMAC approach rather than invent a
  second scheme, and immediately warns that the two must not be
  interchangeable. That is not hypothetical: they are signed with the same
  SESSION_SECRET, so if the formats ever converged, a bearer token pasted into
  a cookie would be a browser session for the owner's whole account, and a
  stolen cookie would be a bearer token for the MCP endpoint — each bypassing
  the checks the other one carries (audience and scope on one side, SameSite
  and HttpOnly on the other).

  Two things keep them apart: the payload is structurally different (two
  segments against three), and the MAC covers a label naming which kind of
  token it is.

  WHAT IS NOT TESTED HERE, AND WHY. The obvious pair of tests -- feed a
  session cookie to verifyAccessToken, feed an access token to verifySession,
  expect null from both -- were written, run, and then deleted. Both pass, and
  both pass no matter what the implementation does: a session cookie has three
  segments where an access token has two, and its payload is not JSON, so
  every mutation of either verifier still refuses it. A test that cannot be
  made to fail reports green forever and guards nothing; the house rule
  (prove it by mutating the source) is what surfaced them.

  The test below is the one that earns its place. It asserts the MECHANISM --
  the differing segment counts -- and it fails the moment either layout
  changes, which is the only way this property can actually be lost.
*/
describe('access tokens and session cookies are not interchangeable', () => {
  /*
    THE MECHANISM, and the one test here a mutation can actually kill: the two
    formats have a different number of segments, and each verifier refuses the
    other's count before looking at anything else. Change the layout of either
    token and this fails -- which is the point, because the two tests above it
    would not.
  */
  it('has a different segment count from a session cookie, which is what separates them', () => {
    expect(issue().split('.')).toHaveLength(2);
    expect(signSession(USER, T0, SECRET).split('.')).toHaveLength(3);
  });
});
