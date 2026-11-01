import { createHash, randomBytes } from 'node:crypto';

/**
 * The opaque secrets the authorization server hands out: authorization codes
 * and refresh tokens.
 *
 * Nothing here is ever read by a person, which is the whole difference from
 * the link codes this work replaces. Those were short because somebody had to
 * type them off a phone, and their safety came from being single-use,
 * ten-minute and rate-limited. These travel in a redirect and in a JSON body,
 * so there is no reason to be short and every reason not to be: 256 bits makes
 * guessing one irrelevant as an attack, and the single-use discipline is then
 * belt to that braces rather than the only thing holding.
 */

/** 32 random bytes, base64url: 43 characters, 256 bits. */
export function newOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * A client id. Not a secret -- it travels in every authorization URL and is
 * shown in logs -- but still random, because it is also the primary key of a
 * row an unauthenticated caller creates, and a guessable one would let anybody
 * probe for which clients exist.
 */
export function newClientId(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Stored as a hash, so a database dump is not a set of working credentials.
 *
 * Plain SHA-256 rather than a password hash, and the reasoning is the opposite
 * of a password's: the input is 256 bits of uniform randomness, so there is no
 * dictionary to run and no rainbow table to build. Stretching would slow every
 * honest redemption to defend against an attack that is already infeasible.
 */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('base64url');
}
