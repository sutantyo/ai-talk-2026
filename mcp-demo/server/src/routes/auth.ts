import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { SESSION_COOKIE, type SessionResponse } from '../../../shared/protocol.js';
import { signSession, verifySession, shouldReissue, sessionCookieOptions } from '../session.js';
import type { UserStore } from '../store.js';
import { GoogleAuthError, type VerifyIdToken } from '../google.js';
import { isEmailAllowed, type Allowlist } from '../allowlist.js';

export interface ApiDeps {
  store: UserStore;
  verifyGoogleIdToken: VerifyIdToken;
  sessionSecret: string;
  secureCookies: boolean;
  /** `null` = no restriction. See `allowlist.ts` for the full fail-open/fail-closed discussion. */
  allowedEmails: Allowlist;
  /** Injected so session sliding and expiry are testable without fake timers. */
  now(): number;
}

const SIGNED_OUT: SessionResponse = { signedIn: false, userId: null, email: null, name: null };

/**
 * Resolves the session cookie to a user id, refreshing the cookie when the
 * session has slid far enough to be worth re-signing.
 *
 * Returns `null` for every failure — absent, malformed, forged, expired — and
 * deliberately does not tell the caller which. Signed out is a normal state in
 * this app rather than an error, and every caller's correct response to all
 * four cases is identical.
 *
 * Deliberately does not re-check `allowedEmails`. The allowlist is a gate on
 * *creating* a session (see `POST /api/auth/google` below), not on holding
 * one — see `allowlist.ts` for why an already-issued session outlives its
 * owner's removal from the list, and what to do if that is ever wrong for a
 * given situation.
 */
export function readSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: ApiDeps
): string | null {
  const now = deps.now();
  const session = verifySession(request.cookies[SESSION_COOKIE], now, deps.sessionSecret);
  if (session === null) return null;

  if (shouldReissue(session.issuedAtMs, now)) {
    reply.setCookie(
      SESSION_COOKIE,
      signSession(session.userId, now, deps.sessionSecret),
      sessionCookieOptions(deps.secureCookies)
    );
  }

  return session.userId;
}

export function registerAuthRoutes(app: FastifyInstance, deps: ApiDeps): void {
  /**
   * The one place a Google credential is ever accepted. It is exchanged
   * immediately for this server's own cookie and is never stored, never
   * logged, and never sent anywhere else. No refresh token, no OAuth redirect,
   * no Google API scope: only identity is needed.
   *
   * **Order matters and is load-bearing:** verify, *then* authorise, then
   * touch the store. `isEmailAllowed` is checked only after
   * `verifyGoogleIdToken` has already succeeded, against the `email` that
   * verification itself returned — never against anything read off the raw,
   * unverified request. Checking the list first, or checking it against an
   * unverified claim, is exactly the bug this ordering exists to make
   * impossible: an attacker's own unsigned claim would decide whether they
   * get in.
   *
   * **Four outcomes, not three.** This deliberately overrides an earlier
   * three-outcome design (200 / 401 `invalid_credential` / 403
   * `not_allowlisted`): a `GoogleAuthError` whose `reason` is
   * `'verification_unavailable'` — Google's JWKS endpoint itself was
   * unreachable (outage, DNS, TLS, timeout, non-200) — is answered `503
   * { error: 'verification_unavailable' }`, not `401`. Every other
   * `GoogleAuthError` reason (a `ClaimFailure` or `'bad_signature'`) still
   * collapses to `401 { error: 'invalid_credential' }`, and that collapse is
   * still deliberate: those reasons genuinely describe the *token*, and
   * echoing which one failed would hand a prober information about the
   * checks it needs to pass. `verification_unavailable` is different in
   * kind — it describes this server's ability to reach Google right now, not
   * anything about the caller's token — so telling the caller "this is
   * temporary, retry" is not a leak, it is the honest answer. A 401 here
   * would tell a legitimate signed-out user their credential was invalid and
   * that they should try signing in again, which is both false (nothing was
   * wrong with their token) and unactionable (retrying hits the same
   * unreachable endpoint).
   */
  app.post('/api/auth/google', async (request, reply) => {
    const body = request.body as { credential?: unknown } | undefined;
    const credential = body?.credential;
    if (typeof credential !== 'string' || credential === '') {
      return reply.code(400).send({ error: 'missing_credential' });
    }

    let identity;
    try {
      identity = await deps.verifyGoogleIdToken(credential);
    } catch (err) {
      if (err instanceof GoogleAuthError && err.reason === 'verification_unavailable') {
        return reply.code(503).send({ error: 'verification_unavailable' });
      }
      // The reason is deliberately not echoed for every other case: a caller
      // who learns *why* a token was rejected learns how to craft a better
      // one, and a legitimate client has nothing to do differently in any of
      // those cases.
      return reply.code(401).send({ error: 'invalid_credential' });
    }

    // Authorisation, strictly after verification. `403`, never `401`: the
    // credential was genuine, so this is not "sign in again", it is "this
    // account is not allowed" — and the client (Task 13) shows a different
    // message for the two because they call for a different next action.
    if (!isEmailAllowed(identity.email, deps.allowedEmails)) {
      return reply.code(403).send({ error: 'not_allowlisted' });
    }

    const user = await deps.store.upsertUser(identity);
    reply.setCookie(
      SESSION_COOKIE,
      signSession(user.id, deps.now(), deps.sessionSecret),
      sessionCookieOptions(deps.secureCookies)
    );

    const response: SessionResponse = {
      signedIn: true,
      userId: user.id,
      email: user.email,
      name: user.name
    };
    return reply.send(response);
  });

  /**
   * Always 200. A 401 here would be technically defensible and practically
   * wrong: the client asks this on every start, signed out is the expected
   * answer for a phase-1 user who never signs in at all, and an error status
   * invites a fetch wrapper somewhere to treat the normal case as a failure
   * worth surfacing to somebody looking for a phrase.
   */
  app.get('/api/auth/session', async (request, reply) => {
    const userId = readSession(request, reply, deps);
    if (userId === null) return reply.send(SIGNED_OUT);

    const user = await deps.store.userById(userId);
    if (user === null) return reply.send(SIGNED_OUT);

    const response: SessionResponse = {
      signedIn: true,
      userId: user.id,
      email: user.email,
      name: user.name
    };
    return reply.send(response);
  });

  app.post('/api/auth/signout', async (_request, reply) => {
    reply.setCookie(SESSION_COOKIE, '', {
      ...sessionCookieOptions(deps.secureCookies),
      maxAge: 0
    });
    return reply.send(SIGNED_OUT);
  });
}
