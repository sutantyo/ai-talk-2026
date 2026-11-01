import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The bearer token the MCP resource server accepts.
 *
 * Signed and stateless, reusing the HMAC approach `session.ts` already uses
 * rather than introducing a JWT library and its configuration surface for the
 * five claims this carries. Signed with the same `SESSION_SECRET`.
 *
 * AND THEREFORE: NOT A SESSION COOKIE, and not interchangeable with one. Two
 * things keep them apart, and they are separate on purpose so that neither
 * alone is load-bearing:
 *
 *   1. SHAPE. A session cookie is three dot-separated segments
 *      (`id.issuedAt.mac`); this is two (`payload.mac`). Each verifier
 *      refuses the other's segment count before looking at anything else.
 *   2. LABEL. The MAC covers a string naming what kind of token this is, so
 *      even if the two formats ever converged on the same shape, a MAC minted
 *      for one could not verify as the other.
 *
 * Without that separation, a bearer token pasted into a cookie would be a
 * browser session for the whole account, and a stolen cookie would be a
 * bearer token for the MCP endpoint — each one skipping the checks the other
 * carries: audience and scope on this side, HttpOnly and SameSite on that one.
 */

/**
 * One hour. Short because a leaked bearer token cannot be revoked — it is
 * stateless by design, so nothing is stored that could be deleted to stop it.
 * The refresh token is the long-lived half, and that one IS stored, hashed,
 * and can be.
 */
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

/** See (2) above. Versioned so a future format change is a new label. */
const MAC_LABEL = 'jpb.oauth.access-token.v1';

export interface AccessTokenClaims {
  /** The user id. `sub` on the wire. */
  subject: string;
  /** The canonical MCP URL. A resource server must refuse anything else. */
  audience: string;
  /** Space-delimited, already canonicalised by `parseScopeRequest`. */
  scope: string;
  issuedAtMs: number;
}

export interface VerifiedAccessToken {
  subject: string;
  scope: string;
  issuedAtMs: number;
  expiresAtMs: number;
}

interface Payload {
  v: number;
  sub: string;
  aud: string;
  scope: string;
  iat: number;
  exp: number;
}

export function signAccessToken(claims: AccessTokenClaims, secret: string): string {
  const payload: Payload = {
    v: 1,
    sub: claims.subject,
    aud: claims.audience,
    scope: claims.scope,
    iat: claims.issuedAtMs,
    // Carried explicitly rather than derived at verification time, because the
    // token endpoint has to report `expires_in` and the two must not be able
    // to disagree. Covered by the MAC, so this is not a client-editable field.
    exp: claims.issuedAtMs + ACCESS_TOKEN_TTL_MS
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${mac(encoded, secret)}`;
}

/**
 * Returns the token's claims, or `null` for every kind of failure — absent,
 * malformed, forged, expired, or issued for a different audience — and
 * deliberately does not say which. The caller's answer is one `401` in every
 * case, and telling a prober which check it failed tells it what to fix.
 *
 * `audience` is required, not optional. The resource server must reject a
 * token whose audience is not itself, and a defaulted or omitted audience
 * would make that check something a caller could forget rather than something
 * the signature of this function insists on.
 */
export function verifyAccessToken(
  token: string | undefined,
  options: { audience: string; nowMs: number; secret: string }
): VerifiedAccessToken | null {
  if (token === undefined || token === '') return null;

  const parts = token.split('.');
  // Two, not three: this is what refuses a session cookie outright.
  if (parts.length !== 2) return null;
  const [encoded, presented] = parts;

  // The MAC first, so nothing unsigned ever decides anything below.
  if (!constantTimeEquals(presented, mac(encoded, options.secret))) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Payload;
  } catch {
    // Unreachable while the MAC check above holds: this server only ever signs
    // well-formed JSON. Kept because "the signature was valid" is a reason to
    // trust the bytes, not a reason to assume they parse.
    return null;
  }
  if (payload === null || typeof payload !== 'object') return null;
  if (payload.v !== 1) return null;
  if (typeof payload.sub !== 'string' || payload.sub === '') return null;
  if (typeof payload.scope !== 'string') return null;
  if (typeof payload.aud !== 'string') return null;
  if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;

  // Exact, never a prefix: `https://host/mcp` must not open `https://host/mcp2`
  // and must not be opened by `https://host`.
  if (payload.aud !== options.audience) return null;
  if (payload.iat > options.nowMs) return null;
  if (options.nowMs >= payload.exp) return null;

  return {
    subject: payload.sub,
    scope: payload.scope,
    issuedAtMs: payload.iat,
    expiresAtMs: payload.exp
  };
}

function mac(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(`${MAC_LABEL}.${encodedPayload}`).digest('base64url');
}

/**
 * The same length-guarded comparison `session.ts` uses, and deliberately a
 * separate copy rather than an import: `timingSafeEqual` throws on a length
 * mismatch, so this guard is the difference between refusing a malformed
 * bearer token and returning a 500 for one. Both files test that behaviour
 * independently, so neither can lose it quietly.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
