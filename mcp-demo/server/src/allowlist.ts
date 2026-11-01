/**
 * The email allowlist gating Google sign-in.
 *
 * Driven entirely by `ALLOWED_EMAILS`, a Railway service variable —
 * comma-separated, e.g. `ALLOWED_EMAILS=owner@example.com,friend@example.com`.
 * Changing who is allowed in is therefore a Railway variable edit, never a
 * deploy: nothing here is compiled in or cached beyond one process restart.
 *
 * **Matched on email, not on Google's `sub`.** `sub` is the stabler
 * identifier — the design spec and `SessionResponse` key the *account* on it
 * precisely because a person can change their email on Google's side — but
 * the allowlist is a list an owner maintains by hand, and the owner knows
 * people's email addresses, not their opaque Google subject ids. The
 * consequence is deliberate and recorded rather than accidental: **this list
 * is checked once, at the moment of `POST /api/auth/google`, against the
 * email the token carries right then.** It is not re-checked on every
 * request. A user who is let in and later has their email quietly drop off
 * `ALLOWED_EMAILS` keeps whatever session they already hold — the session is
 * keyed on `userId` (derived from `sub`), never re-validates against this
 * list, and expires the same way every other session does, on its own
 * 90-day sliding window (`server/src/session.ts`). Revoking immediately, if
 * that is ever needed, is a `SESSION_SECRET` rotation, which signs out every
 * user at once — a deliberately blunt instrument the plan does not attempt
 * to make finer, because a per-session revocation list is real complexity
 * this product has no other use for. This trade-off — cheap to build, coarse
 * to revoke — is the right one for an allowlist meant to keep strangers from
 * signing up in the first place, not to eject a specific person instantly.
 *
 * **The empty/unset case, decided rather than defaulted into:** `null` below
 * means "no restriction" — every verified email is let in. That is a
 * fail-OPEN default, and it exists on purpose, because the owner's stated
 * intent is "leave it empty later and it opens up." It is also the exact
 * opposite of `server/index.js`'s fail-CLOSED stance today (a missing Basic
 * Auth credential refuses to *start* the server rather than serve it
 * unprotected) — that tension is real and is not resolved by picking one
 * philosophy and applying it everywhere:
 *
 *  - **While `server/index.js`'s Basic Auth still fronts the deploy**, an
 *    empty `ALLOWED_EMAILS` is harmless: it is a second gate standing open
 *    behind a first gate that is shut. This is expected for all of phase 2's
 *    build and initial rollout.
 *  - **The moment Basic Auth is retired**, `ALLOWED_EMAILS` becomes the
 *    *only* gate, and an empty value at that point silently means "anyone
 *    with a Google account." Nothing distinguishes "deliberately opened" from
 *    "forgot to set it."
 *
 *  Recommendation: keep the fail-open default — forcing fail-closed here
 *  would only move today's problem into a second, undocumented flag the
 *  owner has to remember exists — but treat "remove Basic Auth" and "leave
 *  `ALLOWED_EMAILS` unset" as a combination that must never happen silently.
 *  `server/src/index.ts` (Step 10, below) logs a visible startup warning
 *  whenever it boots with no allowlist, so an empty value is a fact on every
 *  deploy log rather than a quiet default nobody notices; Task 14's
 *  deployment documentation states the same rule for a human doing the
 *  Basic Auth cutover by hand.
 */
export type Allowlist = ReadonlySet<string> | null;

/**
 * `undefined` and an empty/whitespace-only string are both "unset" — Railway
 * does not meaningfully distinguish an absent variable from one set to the
 * empty string, so both must produce the same, explicit `null`.
 */
export function parseAllowlist(raw: string | undefined): Allowlist {
  if (raw === undefined || raw.trim() === '') return null;
  const emails = raw
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter((email) => email !== '');
  return new Set(emails);
}

/** Case-insensitive, trimmed — see the module comment on why email, not `sub`. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmailAllowed(email: string, allowlist: Allowlist): boolean {
  // `!allowlist`, not `allowlist === null`. A caller that forgot to supply
  // `allowedEmails` at all hands this `undefined`, and a strict null check
  // would fall through to `undefined.has(...)` — a TypeError inside the auth
  // route, i.e. a 500 where a decision belongs. Failing open here matches the
  // documented meaning of an unset allowlist and keeps the failure mode of a
  // wiring mistake identical to the failure mode of an empty variable.
  if (!allowlist) return true;
  return allowlist.has(normalizeEmail(email));
}
