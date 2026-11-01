import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  FlattenedSign,
  createLocalJWKSet,
  createRemoteJWKSet,
  customFetch,
  type JSONWebKeySet,
  type JWK
} from 'jose';
import { checkGoogleClaims, createGoogleVerifier, GoogleAuthError } from './google';

const NOW = 1_785_000_000; // seconds
const AUD = '123.apps.googleusercontent.com';

function claims(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: 'https://accounts.google.com',
    aud: AUD,
    sub: '110000000000000000001',
    email: 'traveller@example.com',
    email_verified: true,
    name: 'Traveller',
    exp: NOW + 3600,
    iat: NOW - 60,
    ...over
  };
}

const check = (payload: unknown) =>
  checkGoogleClaims(payload, { audience: AUD, nowSeconds: NOW });

describe('checkGoogleClaims', () => {
  it('accepts a well-formed token and extracts the identity', () => {
    expect(check(claims())).toEqual({
      ok: true,
      identity: { sub: '110000000000000000001', email: 'traveller@example.com', name: 'Traveller' }
    });
  });

  it('accepts the bare accounts.google.com issuer Google also uses', () => {
    expect(check(claims({ iss: 'accounts.google.com' })).ok).toBe(true);
  });

  it('rejects any other issuer', () => {
    expect(check(claims({ iss: 'https://accounts.evil.example' }))).toEqual({
      ok: false,
      reason: 'bad_issuer'
    });
  });

  it('rejects a token minted for a different client', () => {
    expect(check(claims({ aud: 'someone-else.apps.googleusercontent.com' }))).toEqual({
      ok: false,
      reason: 'bad_audience'
    });
  });

  it('rejects an expired token', () => {
    expect(check(claims({ exp: NOW - 1 }))).toEqual({ ok: false, reason: 'expired' });
  });

  it('treats exp exactly equal to now as expired', () => {
    expect(check(claims({ exp: NOW }))).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a token issued in the future beyond the allowed skew', () => {
    expect(check(claims({ iat: NOW + 600 }))).toEqual({ ok: false, reason: 'not_yet_valid' });
  });

  it('tolerates small clock skew on iat', () => {
    expect(check(claims({ iat: NOW + 30 })).ok).toBe(true);
  });

  it('rejects a token whose nbf is beyond the allowed skew', () => {
    expect(check(claims({ nbf: NOW + 600 }))).toEqual({ ok: false, reason: 'not_yet_valid' });
  });

  it('tolerates small clock skew on nbf, same as iat', () => {
    expect(check(claims({ nbf: NOW + 30 })).ok).toBe(true);
  });

  it('accepts a token with no nbf at all — Google does not mint one', () => {
    expect(check(claims()).ok).toBe(true);
  });

  it('rejects a token with no subject — sub is the account key', () => {
    expect(check(claims({ sub: undefined }))).toEqual({ ok: false, reason: 'missing_subject' });
  });

  it('rejects an unverified email', () => {
    expect(check(claims({ email_verified: false }))).toEqual({
      ok: false,
      reason: 'unverified_email'
    });
  });

  it('accepts the string "true" Google sometimes sends for email_verified', () => {
    expect(check(claims({ email_verified: 'true' })).ok).toBe(true);
  });

  it('falls back to an empty name rather than failing', () => {
    const result = check(claims({ name: undefined }));
    expect(result.ok).toBe(true);
    expect(result.ok && result.identity.name).toBe('');
  });

  it('rejects a non-object payload without throwing', () => {
    expect(check(null)).toEqual({ ok: false, reason: 'missing_subject' });
    expect(check('a string')).toEqual({ ok: false, reason: 'missing_subject' });
  });

  it('rejects an audience array that does not contain our client id', () => {
    expect(check(claims({ aud: ['other.apps.googleusercontent.com'] }))).toEqual({
      ok: false,
      reason: 'bad_audience'
    });
  });

  it('accepts an audience array that does contain our client id', () => {
    expect(check(claims({ aud: [AUD, 'other'] })).ok).toBe(true);
  });
});

/**
 * `createGoogleVerifier` end-to-end, against real RSA signatures and a real
 * (but never network-touching) jose key resolver. Every key pair below is
 * generated in-process; nothing here ever performs a DNS lookup or opens a
 * socket — see the "offline" note in the task report.
 */
describe('createGoogleVerifier', () => {
  /**
   * `createGoogleVerifier` checks `exp`/`iat` against the real wall clock
   * (`Date.now()`), unlike `checkGoogleClaims` above which takes `nowSeconds`
   * as a parameter. These tokens need claims anchored to *now*, not to the
   * fixed `NOW` fixture used for the pure-function tests above.
   */
  function liveClaims(over: Record<string, unknown> = {}): Record<string, unknown> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return {
      iss: 'https://accounts.google.com',
      aud: AUD,
      sub: '110000000000000000001',
      email: 'traveller@example.com',
      email_verified: true,
      name: 'Traveller',
      exp: nowSeconds + 3600,
      iat: nowSeconds - 60,
      ...over
    };
  }

  async function makeKeyPair(kid: string) {
    const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
    const jwk = (await exportJWK(publicKey)) as JWK;
    jwk.kid = kid;
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    return { publicKey, privateKey, jwk };
  }

  async function sign(
    privateKey: Parameters<SignJWT['sign']>[0],
    kid: string,
    over: Record<string, unknown> = {}
  ): Promise<string> {
    return new SignJWT(liveClaims(over))
      .setProtectedHeader({ alg: 'RS256', kid })
      .sign(privateKey);
  }

  it('accepts a genuinely-signed, well-formed token end to end', async () => {
    const { privateKey, jwk } = await makeKeyPair('key-1');
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    const token = await sign(privateKey, 'key-1');

    await expect(verify(token)).resolves.toEqual({
      sub: '110000000000000000001',
      email: 'traveller@example.com',
      name: 'Traveller'
    });
  });

  it('rejects a token signed by an attacker key sharing a real kid — the signature check is real, not kid-routing trust', async () => {
    const { jwk } = await makeKeyPair('key-1');
    const forger = await generateKeyPair('RS256', { extractable: true });
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    // Signed with the forger's private key, but claiming the real key's kid.
    const forgedToken = await sign(forger.privateKey, 'key-1');

    const rejection = await verify(forgedToken).catch((e: unknown) => e);
    expect(rejection).toBeInstanceOf(GoogleAuthError);
    expect((rejection as GoogleAuthError).reason).toBe('bad_signature');
  });

  it('rejects a token with alg: none', async () => {
    const { jwk } = await makeKeyPair('key-1');
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    const header = Buffer.from(JSON.stringify({ alg: 'none', kid: 'key-1' })).toString(
      'base64url'
    );
    const body = Buffer.from(JSON.stringify(claims())).toString('base64url');
    const noneToken = `${header}.${body}.`;

    const rejection = await verify(noneToken).catch((e: unknown) => e);
    expect(rejection).toBeInstanceOf(GoogleAuthError);
    expect((rejection as GoogleAuthError).reason).toBe('bad_signature');
  });

  it('rejects a genuinely, correctly signed token that uses an unencoded (b64: false) payload', async () => {
    const { privateKey, jwk } = await makeKeyPair('key-1');
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    // `CompactSign` refuses to build this directly ("use the flattened
    // module for creating JWS with b64: false"), so build the compact
    // string by hand from a real `FlattenedSign` signature — this is a
    // genuinely, correctly signed RFC 7797 unencoded-payload JWS, not a
    // syntactically-broken one.
    const unencodedPayload = '{"unencoded":true}'; // no "." characters allowed
    const flat = await new FlattenedSign(new TextEncoder().encode(unencodedPayload))
      .setProtectedHeader({ alg: 'RS256', kid: 'key-1', crit: ['b64'], b64: false })
      .sign(privateKey);
    const token = `${flat.protected}.${unencodedPayload}.${flat.signature}`;

    const rejection = await verify(token).catch((e: unknown) => e);
    expect(rejection).toBeInstanceOf(GoogleAuthError);
    expect((rejection as GoogleAuthError).reason).toBe('bad_signature');
  });

  it('rejects a structurally malformed token without throwing an unrecognised error', async () => {
    const { jwk } = await makeKeyPair('key-1');
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    const rejection = await verify('not-a-jwt-at-all').catch((e: unknown) => e);
    expect(rejection).toBeInstanceOf(GoogleAuthError);
    expect((rejection as GoogleAuthError).reason).toBe('bad_signature');
  });

  it('rejects a validly-signed token for the wrong audience, distinguishably from a bad signature', async () => {
    const { privateKey, jwk } = await makeKeyPair('key-1');
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    const token = await sign(privateKey, 'key-1', { aud: 'someone-else.apps.googleusercontent.com' });

    const rejection = await verify(token).catch((e: unknown) => e);
    expect(rejection).toBeInstanceOf(GoogleAuthError);
    expect((rejection as GoogleAuthError).reason).toBe('bad_audience');
  });

  it('rejects a validly-signed, expired token, distinguishably from a bad signature', async () => {
    const { privateKey, jwk } = await makeKeyPair('key-1');
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    const token = await sign(privateKey, 'key-1', { exp: Math.floor(Date.now() / 1000) - 60 });

    const rejection = await verify(token).catch((e: unknown) => e);
    expect(rejection).toBeInstanceOf(GoogleAuthError);
    expect((rejection as GoogleAuthError).reason).toBe('expired');
  });

  it('rejects a validly-signed token from the wrong issuer, distinguishably from a bad signature', async () => {
    const { privateKey, jwk } = await makeKeyPair('key-1');
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    const token = await sign(privateKey, 'key-1', { iss: 'https://accounts.evil.example' });

    const rejection = await verify(token).catch((e: unknown) => e);
    expect(rejection).toBeInstanceOf(GoogleAuthError);
    expect((rejection as GoogleAuthError).reason).toBe('bad_issuer');
  });

  it('carries a name and message that identify it as a GoogleAuthError with its reason, across the async boundary', async () => {
    const { jwk } = await makeKeyPair('key-1');
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const verify = createGoogleVerifier(AUD, jwks);

    const rejection = await verify('garbage').catch((e: unknown) => e);
    expect(rejection).toBeInstanceOf(GoogleAuthError);
    const authError = rejection as GoogleAuthError;
    expect(authError.name).toBe('GoogleAuthError');
    expect(authError.message).toContain(authError.reason);
  });

  /**
   * Exercises the real production default — `createRemoteJWKSet` — with its
   * network layer swapped for an in-memory fake via jose's `[customFetch]`
   * hook, so this is the actual code path used in production, not a stand-in
   * for it. No socket is ever opened: `fetchCalls` below only ever resolves
   * from an in-memory object.
   *
   * It proves key rotation works end to end: a token signed with a key that
   * was not in the first fetched set is rejected on the first attempt only
   * insofar as it forces a refetch, and succeeds once the (simulated)
   * rotated key set is in place — exactly what has to happen the day Google
   * rotates its signing key and this server has an old set cached.
   */
  it('recovers from key rotation by refetching when it meets an unrecognised kid', async () => {
    const oldKey = await makeKeyPair('key-old');
    const newKey = await makeKeyPair('key-new');

    let fetchCalls = 0;
    const jwksVersions: JSONWebKeySet[] = [
      { keys: [oldKey.jwk] }, // what "Google" serves before rotating
      { keys: [oldKey.jwk, newKey.jwk] } // what it serves after rotating
    ];
    const fakeFetch = async () => {
      const body = jwksVersions[Math.min(fetchCalls, jwksVersions.length - 1)];
      fetchCalls += 1;
      return { status: 200, json: async () => body } as Response;
    };

    const jwks = createRemoteJWKSet(new URL('https://example.invalid/certs'), {
      [customFetch]: fakeFetch,
      cooldownDuration: 0
    });
    const verify = createGoogleVerifier(AUD, jwks);

    const tokenFromOldKey = await sign(oldKey.privateKey, 'key-old');
    await expect(verify(tokenFromOldKey)).resolves.toMatchObject({ sub: expect.any(String) });
    expect(fetchCalls).toBe(1);

    // Rotation: a token signed by a key the first fetch never saw.
    const tokenFromNewKey = await sign(newKey.privateKey, 'key-new');
    await expect(verify(tokenFromNewKey)).resolves.toMatchObject({ sub: expect.any(String) });
    expect(fetchCalls).toBe(2); // it had to refetch to find the rotated key
  });

  /**
   * A JWS whose protected header decodes and whose `alg` is allowed, so the
   * key-resolution function actually runs and reaches the (faked) network
   * layer, but whose payload/signature segments are never touched — because
   * every test below fails during key resolution, before a signature is ever
   * checked. Only the header needs to be well-formed.
   */
  function tokenWithHeader(kid: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid })).toString('base64url');
    return `${header}.x.x`;
  }

  /**
   * `createGoogleVerifier` must distinguish "Google's JWKS endpoint is
   * unreachable/broken" from "this token is forged" — see review Finding 1.
   * Each test here drives the *real* `createRemoteJWKSet` through jose's own
   * `[customFetch]` hook so the thrown error is genuinely jose's, not a
   * stand-in `new Error()` — the same offline pattern the rotation test
   * above uses.
   */
  describe('JWKS infrastructure failures', () => {
    it('reports verification_unavailable when the JWKS fetch times out', async () => {
      const fakeFetch = async () => {
        // The exact shape jose's own fetchJwks() special-cases: it checks
        // `err.name === 'TimeoutError'` and rethrows as its own JWKSTimeout.
        throw Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' });
      };
      const jwks = createRemoteJWKSet(new URL('https://example.invalid/certs'), {
        [customFetch]: fakeFetch
      });
      const verify = createGoogleVerifier(AUD, jwks);

      const rejection = await verify(tokenWithHeader('key-1')).catch((e: unknown) => e);
      expect(rejection).toBeInstanceOf(GoogleAuthError);
      expect((rejection as GoogleAuthError).reason).toBe('verification_unavailable');
    });

    it('reports verification_unavailable on a connection-level fetch failure (DNS/TLS/connection refused)', async () => {
      const fakeFetch = async () => {
        // The exact shape Node's native `fetch` throws for a real DNS
        // failure — confirmed empirically against `fetch()` to a
        // non-resolving host (see the fix report): a plain `TypeError` with
        // a `cause`, not wrapped in any jose class. jose's own `fetchJwks`
        // only special-cases `err.name === 'TimeoutError'`
        // (jose/dist/webapi/jwks/remote.js:16-27) and rethrows everything
        // else — including this — verbatim.
        throw new TypeError('fetch failed', {
          cause: new Error('getaddrinfo ENOTFOUND example.invalid')
        });
      };
      const jwks = createRemoteJWKSet(new URL('https://example.invalid/certs'), {
        [customFetch]: fakeFetch
      });
      const verify = createGoogleVerifier(AUD, jwks);

      const rejection = await verify(tokenWithHeader('key-1')).catch((e: unknown) => e);
      expect(rejection).toBeInstanceOf(GoogleAuthError);
      expect((rejection as GoogleAuthError).reason).toBe('verification_unavailable');
    });

    it('reports verification_unavailable when the JWKS endpoint responds with a non-200 status', async () => {
      const fakeFetch = async () => ({ status: 503, json: async () => ({}) }) as Response;
      const jwks = createRemoteJWKSet(new URL('https://example.invalid/certs'), {
        [customFetch]: fakeFetch
      });
      const verify = createGoogleVerifier(AUD, jwks);

      const rejection = await verify(tokenWithHeader('key-1')).catch((e: unknown) => e);
      expect(rejection).toBeInstanceOf(GoogleAuthError);
      expect((rejection as GoogleAuthError).reason).toBe('verification_unavailable');
    });

    it('reports verification_unavailable when the JWKS endpoint returns a malformed JWKS document', async () => {
      const fakeFetch = async () => ({ status: 200, json: async () => ({ notKeys: [] }) }) as Response;
      const jwks = createRemoteJWKSet(new URL('https://example.invalid/certs'), {
        [customFetch]: fakeFetch
      });
      const verify = createGoogleVerifier(AUD, jwks);

      const rejection = await verify(tokenWithHeader('key-1')).catch((e: unknown) => e);
      expect(rejection).toBeInstanceOf(GoogleAuthError);
      expect((rejection as GoogleAuthError).reason).toBe('verification_unavailable');
    });

    /**
     * The fail-closed boundary: an unknown `kid` is jose's `JWKSNoMatchingKey`,
     * genuinely reachable by an attacker (or a stale key) even when the JWKS
     * endpoint is perfectly healthy, and must stay `bad_signature` — not be
     * swept into `verification_unavailable`. `createRemoteJWKSet` refetches
     * once on a cache miss (`cooldownDuration: 0` here so the retry isn't
     * skipped), so a kid still missing after that second fetch is genuinely
     * unknown, not a transient outage.
     */
    it('still reports bad_signature — not verification_unavailable — when a kid is genuinely unknown even after a refetch', async () => {
      const { jwk } = await makeKeyPair('key-1');
      let fetchCalls = 0;
      const fakeFetch = async () => {
        fetchCalls += 1;
        return { status: 200, json: async () => ({ keys: [jwk] }) } as Response;
      };
      const jwks = createRemoteJWKSet(new URL('https://example.invalid/certs'), {
        [customFetch]: fakeFetch,
        cooldownDuration: 0
      });
      const verify = createGoogleVerifier(AUD, jwks);

      const rejection = await verify(tokenWithHeader('key-does-not-exist')).catch((e: unknown) => e);
      expect(rejection).toBeInstanceOf(GoogleAuthError);
      expect((rejection as GoogleAuthError).reason).toBe('bad_signature');
      expect(fetchCalls).toBe(2); // it refetched once looking for the kid before giving up
    });
  });
});
