import { compactVerify, createRemoteJWKSet, errors as joseErrors } from 'jose';
import type { CompactVerifyGetKey } from 'jose';
import type { GoogleIdentity } from './store.js';

export type ClaimFailure =
  | 'bad_issuer'
  | 'bad_audience'
  | 'expired'
  | 'not_yet_valid'
  | 'missing_subject'
  | 'unverified_email';

/**
 * `verification_unavailable` is deliberately not part of `ClaimFailure`:
 * `checkGoogleClaims` is pure and can never produce it — it can only be
 * thrown by `createGoogleVerifier` when the JWKS infrastructure itself
 * fails, as distinct from a claim being wrong or a signature being forged.
 */
export class GoogleAuthError extends Error {
  constructor(readonly reason: ClaimFailure | 'bad_signature' | 'verification_unavailable') {
    super(`Google ID token rejected: ${reason}`);
    this.name = 'GoogleAuthError';
  }
}

const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');

/** Google's own guidance is to allow a little skew on `iat`. */
const IAT_SKEW_SECONDS = 300;

export type ClaimResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; reason: ClaimFailure };

/**
 * The claim rules, as a pure function over an already-signature-verified
 * payload. No key material, no network, no async — every rule this
 * application depends on is testable as plain data.
 *
 * This is deliberately the *only* place `iss`/`aud`/`exp` are judged.
 * `createGoogleVerifier` below uses `compactVerify` rather than `jwtVerify`
 * specifically so that jose never makes these decisions itself: jose's own
 * claim validation throws one generic error for a bad issuer, a bad
 * audience, or an expired token alike, which would collapse three
 * distinguishable failure reasons into one opaque `bad_signature` before
 * this function ever ran. See the "Why compactVerify, not jwtVerify" note in
 * the task report for the failing test that caught this.
 */
export function checkGoogleClaims(
  payload: unknown,
  opts: { audience: string; nowSeconds: number }
): ClaimResult {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, reason: 'missing_subject' };
  }
  const claims = payload as Record<string, unknown>;

  const sub = claims.sub;
  if (typeof sub !== 'string' || sub === '') return { ok: false, reason: 'missing_subject' };

  if (typeof claims.iss !== 'string' || !GOOGLE_ISSUERS.has(claims.iss)) {
    return { ok: false, reason: 'bad_issuer' };
  }

  const aud = claims.aud;
  const audienceOk = Array.isArray(aud) ? aud.includes(opts.audience) : aud === opts.audience;
  if (!audienceOk) return { ok: false, reason: 'bad_audience' };

  const exp = claims.exp;
  if (typeof exp !== 'number' || exp <= opts.nowSeconds) return { ok: false, reason: 'expired' };

  const iat = claims.iat;
  if (typeof iat === 'number' && iat > opts.nowSeconds + IAT_SKEW_SECONDS) {
    return { ok: false, reason: 'not_yet_valid' };
  }

  // Google does not mint `nbf` on ID tokens, but `jwtVerify` validated it
  // unconditionally whenever present and this hand-rolled replacement should
  // too. Same skew tolerance and same reason as the `iat` check above: absent
  // is valid, present-and-too-far-in-the-future is not.
  const nbf = claims.nbf;
  if (typeof nbf === 'number' && nbf > opts.nowSeconds + IAT_SKEW_SECONDS) {
    return { ok: false, reason: 'not_yet_valid' };
  }

  // Google sends a boolean; some flows have historically sent the string.
  const verified = claims.email_verified;
  if (verified !== true && verified !== 'true') return { ok: false, reason: 'unverified_email' };

  const email = typeof claims.email === 'string' ? claims.email : '';
  const name = typeof claims.name === 'string' ? claims.name : '';

  return { ok: true, identity: { sub, email, name } };
}

export type VerifyIdToken = (idToken: string) => Promise<GoogleIdentity>;

/**
 * Classifies a failure out of `compactVerify`/the JWKS resolver as either a
 * genuine JWKS-infrastructure problem (`verification_unavailable`) or a
 * rejected token (`bad_signature`).
 *
 * The key generalises to "not a `JOSEError` at all" rather than trying to
 * enumerate every transport-failure shape, and that is deliberately safe
 * here in a way a similar-looking "unrecognised defaults to X" choice would
 * not be elsewhere: `bad_signature` and `verification_unavailable` both
 * *reject* the caller — neither one authenticates anybody — so getting the
 * classification wrong is a diagnosability question, not an
 * authentication-bypass one. What actually has to hold is that no
 * attacker-reachable failure is ever misclassified as an outage, and every
 * attacker-reachable failure here is one of jose's own `JOSEError`
 * subclasses:
 *
 * - `JWSSignatureVerificationFailed` — forged signature.
 * - `JOSEAlgNotAllowed` — alg-confusion attack (`alg: none`, cross-algorithm).
 * - `JWKSNoMatchingKey` — unknown `kid`, still missing after
 *   `createRemoteJWKSet`'s automatic one-shot refetch on a cache miss.
 * - `JWSInvalid` / `JWTInvalid` — structurally malformed token.
 *
 * `GOOGLE_JWKS_URL` is a hardcoded constant, not derived from token content,
 * so no crafted token can steer the fetch layer itself into throwing on its
 * behalf — an attacker can only ever produce one of the four classes above.
 * Every one of those extends `JOSEError`, so "not a `JOSEError`" can never
 * match them; only genuine infrastructure trouble reaches this branch:
 *
 * - anything that is not a `JOSEError` instance at all — a connection-level
 *   failure (DNS, TLS, connection refused) from the underlying `fetch` is
 *   *not* wrapped by jose in any class (verified empirically: Node's native
 *   `fetch` throws a plain `TypeError`). Keying on "escaped jose's
 *   classification entirely" catches this without sniffing any particular
 *   runtime's specific error shape, so it holds across `fetch`
 *   implementations rather than just Node's.
 * - `JWKSTimeout` — the fetch exceeded its `AbortSignal` timeout.
 * - `JWKSInvalid` — Google's endpoint responded 200 with a body that is not
 *   a well-formed JWKS document, or with a JWK that isn't a public key.
 *   Nothing an attacker controls; only Google's endpoint can produce this.
 * - the *bare* `JOSEError` (not a more specific subclass) — thrown directly
 *   by jose's `fetchJwks` for a non-200 HTTP status and for a body that
 *   fails to parse as JSON. `err.constructor === joseErrors.JOSEError`
 *   distinguishes this from subclasses such as `JWKSInvalid`, which also
 *   extend `JOSEError` and would otherwise match a plain `instanceof` check.
 *
 * The RFC 7797 unencoded-payload rejection in `createGoogleVerifier` below
 * deliberately throws its own `GoogleAuthError('bad_signature')` from
 * *outside* the `try` this function's result feeds, precisely so a plain
 * `Error` from that check is never handed to this classifier and
 * misclassified as "not a JOSEError" → unavailable.
 */
function classifyVerificationFailure(err: unknown): 'bad_signature' | 'verification_unavailable' {
  if (!(err instanceof joseErrors.JOSEError)) {
    return 'verification_unavailable';
  }
  if (err instanceof joseErrors.JWKSTimeout || err instanceof joseErrors.JWKSInvalid) {
    return 'verification_unavailable';
  }
  if (err.constructor === joseErrors.JOSEError) {
    return 'verification_unavailable';
  }
  return 'bad_signature';
}

/**
 * Decodes a verified JWS payload as JSON. Returns `null` (rather than
 * throwing) on anything that isn't valid JSON, so a malformed-but-signed
 * body degrades to `checkGoogleClaims`'s `missing_subject` path instead of
 * an uncaught exception.
 */
function decodePayload(payload: Uint8Array): unknown {
  try {
    return JSON.parse(Buffer.from(payload).toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * The thin wrapper around the parts that need keys and a network: fetching
 * Google's public JWKS and verifying the RS256 signature.
 *
 * Uses `compactVerify` rather than `jwtVerify` deliberately: `compactVerify`
 * checks only the JWS signature and structure (and, via `algorithms`, that
 * `alg` is RS256 — rejecting `alg: none` and cross-algorithm confusion
 * attacks outright) and hands back the raw payload. It does not look at
 * `iss`/`aud`/`exp` at all, so those stay entirely `checkGoogleClaims`'s
 * decision and every failure reason it can produce survives out to the
 * caller. `jwtVerify` would validate those same claims internally and throw
 * one shared error for all of them, indistinguishable from a bad signature.
 *
 * The `jwks` parameter defaults to `createRemoteJWKSet`, which fetches
 * Google's key set over the network, caches it, and — on encountering a
 * `kid` it doesn't recognise — refetches once (subject to a cooldown), which
 * is what makes Google's key rotation transparent to this code without a
 * redeploy. Tests inject a different resolver (a local, in-memory key set,
 * or a real `createRemoteJWKSet` pointed at a fake `fetch`) so nothing here
 * ever makes a real network call in CI.
 */
export function createGoogleVerifier(
  clientId: string,
  jwks: CompactVerifyGetKey = createRemoteJWKSet(GOOGLE_JWKS_URL)
): VerifyIdToken {
  return async (idToken: string): Promise<GoogleIdentity> => {
    let verified: Awaited<ReturnType<typeof compactVerify>>;
    try {
      verified = await compactVerify(idToken, jwks, { algorithms: ['RS256'] });
    } catch (err) {
      throw new GoogleAuthError(classifyVerificationFailure(err));
    }

    if (verified.protectedHeader.b64 === false) {
      // RFC 7797 unencoded payload. `jwtVerify` (which this deliberately
      // replaced — see the module doc comment) rejects this explicitly
      // ("JWTs MUST NOT use unencoded payload"); `compactVerify` has no
      // opinion on it, so it is restored here. Unreachable without
      // Google's signing key and never produced by Google, but conformance
      // hygiene is free. Deliberately outside the try/catch above — see
      // `classifyVerificationFailure`'s doc comment — so this can never be
      // laundered into `verification_unavailable`.
      throw new GoogleAuthError('bad_signature');
    }

    const payload = decodePayload(verified.payload);

    const result = checkGoogleClaims(payload, {
      audience: clientId,
      nowSeconds: Math.floor(Date.now() / 1000)
    });
    if (!result.ok) throw new GoogleAuthError(result.reason);
    return result.identity;
  };
}
