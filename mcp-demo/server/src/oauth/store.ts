import type { Db as Pool, DbClient as PoolClient } from '../db.js';

/**
 * The authorization server's own persistence: registered clients, live
 * authorization codes, live refresh tokens.
 *
 * DELIBERATELY NOT MORE METHODS ON `SyncStore`. That interface is threaded
 * through every route test as a hand-built fake, and the abandoned link-code
 * work already showed what happens when unrelated methods land on it: three
 * throwing stubs in every fixture that has no business knowing link codes
 * exist. A separate interface means the OAuth routes take the dependency they
 * actually use, and the sync tests never mention it.
 */

export interface OAuthClient {
  clientId: string;
  clientName: string;
  /** Every URI a redemption may be matched against. See `redirectUri.ts`. */
  redirectUris: string[];
}

/** What an authorization code was bound to when it was minted. */
export interface AuthCodeGrant {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
}

/** What a refresh token carries forward. */
export interface RefreshGrant {
  userId: string;
  clientId: string;
  scope: string;
}

export interface OAuthStore {
  registerClient(client: OAuthClient): Promise<void>;
  clientById(clientId: string): Promise<OAuthClient | null>;

  /** The caller hashes; this never sees a code. */
  createAuthCode(code: {
    codeHash: string;
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    scope: string;
    expiresAt: Date;
  }): Promise<void>;

  /**
   * Spends a code, returning what it was bound to -- or `null` if it is
   * unknown, already spent, or expired, WITHOUT saying which.
   *
   * ONE STATEMENT, and that is the whole of what makes a code single-use.
   */
  redeemAuthCode(codeHash: string, now: Date): Promise<AuthCodeGrant | null>;

  createRefreshToken(token: {
    tokenHash: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }): Promise<void>;

  /**
   * Spends the presented token and issues the replacement, atomically.
   *
   * Both halves in one transaction because the response that returns the new
   * refresh token is the same response that invalidates the old one: if these
   * were two independent statements and the process died between them, the
   * owner would hold a spent token and no replacement -- signed out of the
   * connector with nothing to retry and no way to know why.
   */
  rotateRefreshToken(rotation: {
    presentedHash: string;
    /**
     * Part of the same statement, not a check after it: a mismatched client
     * must not be able to spend the owner's live token on its way to being
     * refused.
     */
    clientId: string;
    replacementHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<RefreshGrant | null>;

  /** Housekeeping. Rows outlive their usefulness on purpose -- see the schema. */
  deleteExpiredGrants(before: Date): Promise<number>;
}

interface ClientDbRow {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
}

export function createPostgresOAuthStore(pool: Pool): OAuthStore {
  async function registerClient(client: OAuthClient): Promise<void> {
    await pool.query(
      `insert into oauth_clients (client_id, client_name, redirect_uris)
       values ($1, $2, $3::jsonb)`,
      [client.clientId, client.clientName, JSON.stringify(client.redirectUris)]
    );
  }

  async function clientById(clientId: string): Promise<OAuthClient | null> {
    const { rows } = await pool.query<ClientDbRow>(
      'select client_id, client_name, redirect_uris from oauth_clients where client_id = $1',
      [clientId]
    );
    const row = rows[0];
    if (row === undefined) return null;
    return {
      clientId: row.client_id,
      clientName: row.client_name,
      // `pg` parses jsonb for us, so this is already an array.
      redirectUris: row.redirect_uris
    };
  }

  async function createAuthCode(code: {
    codeHash: string;
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    scope: string;
    expiresAt: Date;
  }): Promise<void> {
    await pool.query(
      `insert into oauth_auth_codes
         (code_hash, client_id, user_id, redirect_uri, code_challenge, scope, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        code.codeHash,
        code.clientId,
        code.userId,
        code.redirectUri,
        code.codeChallenge,
        code.scope,
        code.expiresAt
      ]
    );
  }

  /**
   * ONE STATEMENT. Reading the row, checking it, then marking it spent would be
   * three round trips with a window between the second and third: two callers
   * presenting the same code could both pass the check and both be issued a
   * token for the owner's library. Folding the conditions into the `where`
   * makes Postgres arbitrate -- exactly one update matches, and the loser gets
   * no row back and therefore no token.
   *
   * `returning` rather than a second lookup, for the same reason.
   */
  async function redeemAuthCode(codeHash: string, now: Date): Promise<AuthCodeGrant | null> {
    const { rows } = await pool.query<{
      user_id: string;
      client_id: string;
      redirect_uri: string;
      code_challenge: string;
      scope: string;
    }>(
      `update oauth_auth_codes
          set used_at = $2
        where code_hash = $1
          and used_at is null
          and expires_at > $2
        returning user_id, client_id, redirect_uri, code_challenge, scope`,
      [codeHash, now]
    );
    const row = rows[0];
    if (row === undefined) return null;
    return {
      userId: row.user_id,
      clientId: row.client_id,
      redirectUri: row.redirect_uri,
      codeChallenge: row.code_challenge,
      scope: row.scope
    };
  }

  async function createRefreshToken(token: {
    tokenHash: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }): Promise<void> {
    await pool.query(
      `insert into oauth_refresh_tokens (token_hash, client_id, user_id, scope, expires_at)
       values ($1, $2, $3, $4, $5)`,
      [token.tokenHash, token.clientId, token.userId, token.scope, token.expiresAt]
    );
  }

  /**
   * The same single-statement discipline as `redeemAuthCode` for the spend,
   * wrapped in a transaction with the insert so the pair cannot half-happen.
   *
   * Under two concurrent rotations of the same token, the second `update`
   * blocks on the first's row lock, then re-evaluates `used_at is null` after
   * it commits, matches nothing, and returns null -- having inserted no
   * replacement, because the insert is downstream of a row it never got. A
   * refusal that still minted a live token would make rotation theatre.
   *
   * The scope is carried forward from the spent row rather than taken from the
   * caller: a refresh must never be able to widen what was granted.
   */
  async function rotateRefreshToken(rotation: {
    presentedHash: string;
    clientId: string;
    replacementHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<RefreshGrant | null> {
    const client: PoolClient = await pool.connect();
    let failure: unknown;
    try {
      await client.query('begin');

      const { rows } = await client.query<{ user_id: string; client_id: string; scope: string }>(
        `update oauth_refresh_tokens
            set used_at = $2
          where token_hash = $1
            and client_id = $3
            and used_at is null
            and expires_at > $2
          returning user_id, client_id, scope`,
        [rotation.presentedHash, rotation.now, rotation.clientId]
      );
      const row = rows[0];
      if (row === undefined) {
        await client.query('rollback');
        return null;
      }

      await client.query(
        `insert into oauth_refresh_tokens (token_hash, client_id, user_id, scope, expires_at)
         values ($1, $2, $3, $4, $5)`,
        [rotation.replacementHash, row.client_id, row.user_id, row.scope, rotation.expiresAt]
      );

      await client.query('commit');
      return { userId: row.user_id, clientId: row.client_id, scope: row.scope };
    } catch (error) {
      failure = error;
      try {
        await client.query('rollback');
      } catch {
        // ignored: `error` is what gets thrown below, unchanged.
      }
      throw error;
    } finally {
      // Passing the error tells the pool this connection may be poisoned, so it
      // is discarded rather than handed to the next caller as healthy. Same
      // reasoning as store.ts's sync().
      client.release(failure instanceof Error ? failure : undefined);
    }
  }

  async function deleteExpiredGrants(before: Date): Promise<number> {
    const codes = await pool.query('delete from oauth_auth_codes where expires_at <= $1', [before]);
    const tokens = await pool.query('delete from oauth_refresh_tokens where expires_at <= $1', [
      before
    ]);
    return (codes.rowCount ?? 0) + (tokens.rowCount ?? 0);
  }

  return {
    registerClient,
    clientById,
    createAuthCode,
    redeemAuthCode,
    createRefreshToken,
    rotateRefreshToken,
    deleteExpiredGrants
  };
}
