import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * PKCE, S256 only.
 *
 * Not optional and not negotiable: Claude sends a `code_challenge` on every
 * authorization request regardless of how the client registered, so there is
 * no interoperability argument for supporting `plain` — only the risk of
 * accepting it. RFC 7636.
 */
export const CODE_CHALLENGE_METHOD = 'S256';

/** A base64url SHA-256 digest, unpadded: always exactly 43 characters. */
const CHALLENGE_LENGTH = 43;

/** RFC 7636 section 4.1. */
const VERIFIER_MIN_LENGTH = 43;
const VERIFIER_MAX_LENGTH = 128;

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** RFC 7636's `code_verifier` grammar: unreserved characters only. */
const UNRESERVED = /^[A-Za-z0-9\-._~]+$/;

export function isSupportedCodeChallengeMethod(method: string | undefined): boolean {
  // Case-sensitive: RFC 7636 registers `S256`, and accepting `s256` would mean
  // accepting whatever else a lenient comparison lets through.
  return method === CODE_CHALLENGE_METHOD;
}

/**
 * Checked at the authorization request, before a code is stored, so a code is
 * never minted carrying a challenge that nothing could ever satisfy.
 */
export function isWellFormedCodeChallenge(challenge: string | undefined): boolean {
  if (challenge === undefined) return false;
  if (challenge.length !== CHALLENGE_LENGTH) return false;
  return BASE64URL.test(challenge);
}

/**
 * True when `verifier` is the preimage of `challenge` under S256.
 *
 * The verifier is validated before it is hashed. That ordering matters: a
 * verifier of the wrong length or carrying characters outside RFC 7636's
 * unreserved set has been mangled in transit — by a form encoder, a shell, a
 * URL parser — and hashing whatever arrived would let a mangled verifier be
 * the reason a code was redeemed.
 *
 * There is deliberately no `plain` path. An implementation that fell back to
 * comparing the verifier against the challenge directly would accept a
 * verifier equal to the challenge, and the challenge is not a secret: it
 * travelled in the authorization request. That fallback would hand an attacker
 * holding an intercepted code everything they need.
 */
export function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  if (!isWellFormedCodeChallenge(challenge)) return false;
  if (verifier.length < VERIFIER_MIN_LENGTH || verifier.length > VERIFIER_MAX_LENGTH) return false;
  if (!UNRESERVED.test(verifier)) return false;

  const derived = createHash('sha256').update(verifier).digest('base64url');
  // Both sides are known to be `CHALLENGE_LENGTH` here — the challenge by the
  // guard above, the digest by construction — so `timingSafeEqual` cannot
  // throw on a length mismatch. The guard is what makes that true.
  return timingSafeEqual(Buffer.from(derived, 'utf8'), Buffer.from(challenge, 'utf8'));
}
