import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  CODE_CHALLENGE_METHOD,
  isSupportedCodeChallengeMethod,
  isWellFormedCodeChallenge,
  verifyCodeChallenge
} from './pkce';

/** What a correct client computes. Written out rather than imported, so this
 * file checks the implementation against RFC 7636 rather than against itself. */
const s256 = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

// The RFC 7636 appendix B example, which is the one value in this file that is
// known-correct independently of any code here.
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('the challenge method', () => {
  it('is S256, and plain is not supported', () => {
    // Advertised as `code_challenge_methods_supported: ["S256"]`, and the
    // design says PKCE S256 is mandatory: Claude sends a challenge on every
    // authorization request regardless of how the client registered.
    expect(CODE_CHALLENGE_METHOD).toBe('S256');
    expect(isSupportedCodeChallengeMethod('S256')).toBe(true);
    expect(isSupportedCodeChallengeMethod('plain')).toBe(false);
    expect(isSupportedCodeChallengeMethod('s256')).toBe(false);
    expect(isSupportedCodeChallengeMethod(undefined)).toBe(false);
  });
});

describe('verifyCodeChallenge', () => {
  it('accepts the RFC 7636 worked example', () => {
    expect(verifyCodeChallenge(RFC_VERIFIER, RFC_CHALLENGE)).toBe(true);
  });

  it('accepts a verifier whose S256 hash is the challenge', () => {
    const verifier = 'a'.repeat(43);
    expect(verifyCodeChallenge(verifier, s256(verifier))).toBe(true);
  });

  it('refuses the wrong verifier', () => {
    const verifier = 'a'.repeat(43);
    expect(verifyCodeChallenge('b'.repeat(43), s256(verifier))).toBe(false);
  });

  /*
    THE ONE THAT MATTERS MOST. `plain` PKCE compares the verifier to the
    challenge directly, and an implementation that fell back to that — or that
    compared before hashing — would accept a verifier equal to the challenge.
    An attacker who intercepts an authorization code sees the challenge (it
    travelled in the authorization request), so that fallback hands them the
    verifier and the whole point of PKCE with it.
  */
  it('refuses a verifier that equals the challenge, which is what a plain fallback would accept', () => {
    expect(verifyCodeChallenge(RFC_CHALLENGE, RFC_CHALLENGE)).toBe(false);
  });

  it('refuses a hex digest offered as the challenge, not just a wrong one', () => {
    // base64url is the required encoding. Accepting hex would mean the
    // encoding is not being checked at all, only the bytes.
    const verifier = 'a'.repeat(43);
    const hex = createHash('sha256').update(verifier).digest('hex');
    expect(verifyCodeChallenge(verifier, hex)).toBe(false);
  });

  it('refuses a base64 digest with standard alphabet and padding', () => {
    const verifier = 'a'.repeat(43);
    const standard = createHash('sha256').update(verifier).digest('base64');
    expect(verifyCodeChallenge(verifier, standard)).toBe(false);
  });

  it('refuses a verifier shorter than the 43 characters RFC 7636 requires', () => {
    // Below 43 characters the verifier carries less entropy than PKCE assumes,
    // and a client sending one is broken rather than unlucky. Refusing here
    // means the short verifier can never be the reason a code was redeemed.
    const verifier = 'a'.repeat(42);
    expect(verifyCodeChallenge(verifier, s256(verifier))).toBe(false);
  });

  it('refuses a verifier longer than the 128 characters RFC 7636 allows', () => {
    const verifier = 'a'.repeat(129);
    expect(verifyCodeChallenge(verifier, s256(verifier))).toBe(false);
  });

  it('accepts the boundary lengths, 43 and 128', () => {
    for (const length of [43, 128]) {
      const verifier = 'a'.repeat(length);
      expect(verifyCodeChallenge(verifier, s256(verifier))).toBe(true);
    }
  });

  it('refuses a verifier carrying characters outside the unreserved set', () => {
    // RFC 7636 restricts the verifier to [A-Za-z0-9-._~]. A verifier with a
    // space or a slash in it has been mangled in transit — by a form encoder,
    // a shell, or a URL parser — and the honest answer is to refuse rather
    // than to hash whatever arrived.
    for (const bad of ['a'.repeat(42) + ' ', 'a'.repeat(42) + '/', 'a'.repeat(42) + '+']) {
      expect(verifyCodeChallenge(bad, s256(bad))).toBe(false);
    }
  });

  it('refuses an empty verifier or an empty challenge without throwing', () => {
    expect(verifyCodeChallenge('', '')).toBe(false);
    expect(verifyCodeChallenge(RFC_VERIFIER, '')).toBe(false);
    expect(verifyCodeChallenge('', RFC_CHALLENGE)).toBe(false);
  });

  it('refuses a challenge of the wrong length without throwing', () => {
    // `crypto.timingSafeEqual` throws on a length mismatch, so a comparison
    // with no length guard turns a malformed authorization request into a 500
    // instead of a refusal. Same hazard, and the same guard, as
    // `constantTimeEquals` in session.ts.
    expect(verifyCodeChallenge(RFC_VERIFIER, 'x')).toBe(false);
    expect(verifyCodeChallenge(RFC_VERIFIER, RFC_CHALLENGE + 'x')).toBe(false);
  });
});

describe('isWellFormedCodeChallenge', () => {
  it('accepts a 43-character base64url digest', () => {
    expect(isWellFormedCodeChallenge(RFC_CHALLENGE)).toBe(true);
  });

  it('refuses an absent, empty, or wrongly sized challenge', () => {
    // Checked at the authorization request, before anything is stored, so a
    // code is never minted carrying a challenge nothing could ever satisfy.
    expect(isWellFormedCodeChallenge(undefined)).toBe(false);
    expect(isWellFormedCodeChallenge('')).toBe(false);
    expect(isWellFormedCodeChallenge('a'.repeat(42))).toBe(false);
    expect(isWellFormedCodeChallenge('a'.repeat(44))).toBe(false);
  });

  it('refuses padding and the standard base64 alphabet', () => {
    expect(isWellFormedCodeChallenge('a'.repeat(42) + '=')).toBe(false);
    expect(isWellFormedCodeChallenge('a'.repeat(42) + '+')).toBe(false);
    expect(isWellFormedCodeChallenge('a'.repeat(42) + '/')).toBe(false);
  });
});
