import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { readSession, type ApiDeps } from './auth.js';
import type { OAuthClient, OAuthStore } from '../oauth/store.js';
import {
  authorizationServerMetadata,
  mcpResourceUrl,
  protectedResourceMetadata
} from '../oauth/metadata.js';
import { isRegisterableRedirectUri, redirectUriMatches } from '../oauth/redirectUri.js';
import {
  isSupportedCodeChallengeMethod,
  isWellFormedCodeChallenge,
  verifyCodeChallenge
} from '../oauth/pkce.js';
import { parseScopeRequest } from '../oauth/scope.js';
import { hashOpaqueToken, newClientId, newOpaqueToken } from '../oauth/secrets.js';
import { ACCESS_TOKEN_TTL_MS, signAccessToken } from '../oauth/accessToken.js';
import { AUTH_CODE_TTL_MS, REFRESH_TOKEN_TTL_MS } from '../oauth/lifetimes.js';
import { parseFormBody, single } from '../oauth/formBody.js';
import {
  renderConsentPage,
  renderRequestErrorPage,
  renderSignInPage,
  type AuthorizeRequest
} from '../oauth/consentPage.js';

/**
 * The OAuth 2.1 authorization server: discovery, dynamic registration,
 * session-gated consent, and token issue and refresh.
 *
 * See docs/superpowers/specs/2026-08-22-remote-mcp-connector-design.md. This is
 * plan one of three; nothing here knows what MCP is.
 *
 * THE IDENTITY HALF IS UNCHANGED. `/oauth/authorize` introduces no new login:
 * it reads the same session cookie the app already sets, and when there is
 * none it offers the same Google sign-in, posting to the same
 * `/api/auth/google`, gated by the same `ALLOWED_EMAILS`. Nobody gains a way
 * into the library who did not have one.
 */

export interface OAuthDeps {
  store: OAuthStore;
  /** Origin, no trailing slash. Every advertised URL is built from it. */
  publicBaseUrl: string;
  /**
   * Needed only to render Google's button on the signed-out consent page.
   * Lives here rather than on `ApiDeps` so every existing route-test fixture
   * keeps compiling -- the same reasoning that kept `OAuthStore` off
   * `SyncStore`.
   */
  googleClientId: string;
}

/**
 * A legitimate body on any of these endpoints is a few hundred bytes. They are
 * reachable from the internet by anyone, so the 1MiB Fastify default would be
 * an invitation to make this server buffer a megabyte per request for free --
 * the same reasoning as `app.ts`'s note about not raising the limit globally,
 * pointed the other way.
 */
const FORM_BODY_LIMIT_BYTES = 8 * 1024;
const REGISTRATION_BODY_LIMIT_BYTES = 8 * 1024;

/** Rendered on the consent screen, so it is bounded as well as escaped. */
const MAX_CLIENT_NAME_LENGTH = 200;

const NO_STORE = 'no-store';

type Validation =
  | { ok: true; client: OAuthClient; request: AuthorizeRequest }
  /** Cannot be sent back to the client: a person has to read it. */
  | { ok: false; page: string }
  /** Can be, and per RFC 6749 must be, sent back to the client. */
  | { ok: false; redirectUri: string; error: string; state: string | undefined };

export function registerOAuthRoutes(app: FastifyInstance, api: ApiDeps, oauth: OAuthDeps): void {
  const resource = mcpResourceUrl(oauth.publicBaseUrl);

  // ------------------------------------------------------------------ discovery

  app.get('/.well-known/oauth-protected-resource', async (_request, reply) =>
    reply.send(protectedResourceMetadata(oauth.publicBaseUrl))
  );

  app.get('/.well-known/oauth-authorization-server', async (_request, reply) =>
    reply.send(authorizationServerMetadata(oauth.publicBaseUrl))
  );

  // --------------------------------------------------------------- registration

  /**
   * RFC 7591. Open to anyone, which is what DCR means -- so the narrowing
   * happens on the redirect URIs (see `redirectUri.ts` for the attack this
   * closes) rather than on who may call this.
   */
  app.post(
    '/oauth/register',
    { bodyLimit: REGISTRATION_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const body = request.body;
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return registrationError(reply, 'invalid_client_metadata', 'Expected a JSON object.');
      }
      const metadata = body as Record<string, unknown>;

      const redirectUris = metadata.redirect_uris;
      if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
        return registrationError(
          reply,
          'invalid_redirect_uri',
          'redirect_uris must be a non-empty array.'
        );
      }
      for (const uri of redirectUris) {
        if (typeof uri !== 'string' || !isRegisterableRedirectUri(uri)) {
          return registrationError(
            reply,
            'invalid_redirect_uri',
            'This server registers only the Claude callback and http loopback redirect URIs.'
          );
        }
      }

      const nameRaw = metadata.client_name;
      let clientName = 'Unnamed connector';
      if (nameRaw !== undefined && nameRaw !== '') {
        if (typeof nameRaw !== 'string' || nameRaw.length > MAX_CLIENT_NAME_LENGTH) {
          return registrationError(
            reply,
            'invalid_client_metadata',
            `client_name must be a string of at most ${MAX_CLIENT_NAME_LENGTH} characters.`
          );
        }
        clientName = nameRaw;
      }

      const clientId = newClientId();
      await oauth.store.registerClient({ clientId, clientName, redirectUris });

      return reply.code(201).header('cache-control', NO_STORE).send({
        client_id: clientId,
        client_name: clientName,
        redirect_uris: redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        // No client_secret, and none stored: a public client, authenticated by
        // PKCE and by its registered redirect URIs.
        token_endpoint_auth_method: 'none',
        client_id_issued_at: Math.floor(api.now() / 1000)
      });
    }
  );

  // ------------------------------------------------------------------ authorize

  /**
   * VALIDATION ORDER IS LOAD-BEARING, per RFC 6749 section 4.1.2.1.
   *
   * Until the client is known and its redirect URI has been matched against
   * what that client registered, there is nowhere safe to send an error: the
   * only candidate is a URI this server has not verified, and redirecting to it
   * turns this endpoint into an open redirect that bounces a browser anywhere.
   * So those two failures render a page.
   *
   * After that point the opposite is true: the error MUST go back to the
   * client, with `state`, so it can tell the user something instead of hanging.
   */
  async function validate(source: Record<string, unknown>): Promise<Validation> {
    const clientId = single(source, 'client_id');
    if (clientId === undefined) {
      return { ok: false, page: 'The request did not say which connector is asking.' };
    }
    const client = await oauth.store.clientById(clientId);
    if (client === null) {
      return {
        ok: false,
        page: 'This connector is not registered with this organiser, or its registration has been removed.'
      };
    }

    const redirectUri = single(source, 'redirect_uri');
    if (redirectUri === undefined) {
      return { ok: false, page: 'The request did not say where to send you back to.' };
    }
    if (!client.redirectUris.some((registered) => redirectUriMatches(registered, redirectUri))) {
      return {
        ok: false,
        page: 'The address this connector asked to be sent back to is not one it registered.'
      };
    }

    // From here, every failure goes back to the client.
    const state = single(source, 'state');
    const fail = (error: string): Validation => ({ ok: false, redirectUri, error, state });

    if (single(source, 'response_type') !== 'code') return fail('unsupported_response_type');

    const codeChallenge = single(source, 'code_challenge');
    const codeChallengeMethod = single(source, 'code_challenge_method');
    // Both required. RFC 7636 would default an absent method to `plain`, which
    // is the one method this server refuses to implement -- so an absent method
    // is a refusal, never an assumption.
    if (!isSupportedCodeChallengeMethod(codeChallengeMethod)) return fail('invalid_request');
    if (!isWellFormedCodeChallenge(codeChallenge)) return fail('invalid_request');

    const scope = parseScopeRequest(single(source, 'scope'));
    if (scope === null) return fail('invalid_scope');

    // RFC 8707. Absent is fine -- not every client sends it -- but a value
    // naming some other resource is a misconfiguration worth saying out loud,
    // rather than issuing a token whose audience the resource server will
    // reject with nothing explaining why.
    const requestedResource = single(source, 'resource');
    if (requestedResource !== undefined && requestedResource !== resource) {
      return fail('invalid_target');
    }

    return {
      ok: true,
      client,
      request: {
        clientId,
        redirectUri,
        responseType: 'code',
        codeChallenge: codeChallenge as string,
        codeChallengeMethod: codeChallengeMethod as string,
        scope,
        state,
        resource: requestedResource
      }
    };
  }

  /** The signed-out page, or the consent page. Never cached: it is about a live session. */
  async function renderDecision(
    request: FastifyRequest,
    reply: FastifyReply,
    validated: { client: OAuthClient; request: AuthorizeRequest }
  ): Promise<FastifyReply> {
    reply.header('cache-control', NO_STORE).type('text/html; charset=utf-8');

    const userId = readSession(request, reply, api);
    const user = userId === null ? null : await api.store.userById(userId);
    if (user === null) {
      // Also covers a validly signed cookie for a user who no longer exists:
      // signing in again is the only useful thing to offer.
      return reply.send(renderSignInPage({ googleClientId: oauth.googleClientId }));
    }

    return reply.send(
      renderConsentPage({
        clientName: validated.client.clientName,
        email: user.email,
        request: validated.request
      })
    );
  }

  app.get('/oauth/authorize', async (request, reply) => {
    const validated = await validate((request.query ?? {}) as Record<string, unknown>);
    if (!validated.ok) return answerInvalid(reply, validated);
    return renderDecision(request, reply, validated);
  });

  // ---------------------------------------------------------------- form routes

  /**
   * The two endpoints RFC 6749 requires to read
   * `application/x-www-form-urlencoded`, in their own encapsulated plugin so
   * the content-type parser stays scoped to them. Registering it on the root
   * instance would teach `/api/*` to accept form bodies as well, which nothing
   * there wants and which would quietly widen what those endpoints accept.
   */
  app.register(async (instance) => {
    instance.addContentTypeParser(
      'application/x-www-form-urlencoded',
      { parseAs: 'string' },
      (_request, body, done) => {
        // Handed on raw. `parseFormBody` does the work, so a malformed body
        // answers with an RFC 6749 error object rather than Fastify's own
        // error shape, which no OAuth client can read.
        done(null, body);
      }
    );

    instance.post(
      '/oauth/authorize',
      { bodyLimit: FORM_BODY_LIMIT_BYTES },
      async (request, reply) => {
        const params = parseFormBody(request.body);
        if (params === null) {
          return reply
            .code(400)
            .header('cache-control', NO_STORE)
            .type('text/html; charset=utf-8')
            .send(renderRequestErrorPage('That form could not be read.'));
        }

        // Re-validated from scratch. The hidden fields came from this server,
        // but what arrives is whatever the browser sent -- trusting them
        // because "we put them there" is how an open redirect gets built.
        const validated = await validate(params);
        if (!validated.ok) return answerInvalid(reply, validated);

        const userId = readSession(request, reply, api);
        const user = userId === null ? null : await api.store.userById(userId);
        if (user === null) {
          // THE GATE. No session, no code -- however well-formed the request
          // and whatever the decision field says.
          return renderDecision(request, reply, validated);
        }

        if (params.decision !== 'allow') {
          return redirectBack(reply, validated.request.redirectUri, {
            error: 'access_denied',
            state: validated.request.state
          });
        }

        const code = newOpaqueToken();
        await oauth.store.createAuthCode({
          codeHash: hashOpaqueToken(code),
          clientId: validated.request.clientId,
          userId: user.id,
          // Stored as presented and re-checked at redemption, per RFC 6749.
          redirectUri: validated.request.redirectUri,
          codeChallenge: validated.request.codeChallenge,
          scope: validated.request.scope,
          expiresAt: new Date(api.now() + AUTH_CODE_TTL_MS)
        });

        return redirectBack(reply, validated.request.redirectUri, {
          code,
          state: validated.request.state
        });
      }
    );

    instance.post('/oauth/token', { bodyLimit: FORM_BODY_LIMIT_BYTES }, async (request, reply) => {
      reply.header('cache-control', NO_STORE);

      const params = parseFormBody(request.body);
      if (params === null) return tokenError(reply, 400, 'invalid_request');

      const clientId = single(params, 'client_id');
      if (clientId === undefined) return tokenError(reply, 401, 'invalid_client');
      if ((await oauth.store.clientById(clientId)) === null) {
        return tokenError(reply, 401, 'invalid_client');
      }

      const grantType = single(params, 'grant_type');
      if (grantType === 'authorization_code') {
        return authorizationCodeGrant(reply, params, clientId);
      }
      if (grantType === 'refresh_token') {
        return refreshTokenGrant(reply, params, clientId);
      }
      return tokenError(reply, 400, 'unsupported_grant_type');
    });
  });

  async function authorizationCodeGrant(
    reply: FastifyReply,
    params: Record<string, string>,
    clientId: string
  ): Promise<FastifyReply> {
    const code = single(params, 'code');
    const verifier = single(params, 'code_verifier');
    const redirectUri = single(params, 'redirect_uri');
    if (code === undefined || verifier === undefined || redirectUri === undefined) {
      return tokenError(reply, 400, 'invalid_request');
    }

    /*
      THE CODE IS SPENT BEFORE ANY OF THE CHECKS BELOW, and that ordering is
      deliberate. RFC 6749 section 4.1.2 says a code used more than once should
      be revoked; burning it on a FAILED attempt goes slightly further and
      removes the obvious attack on PKCE -- an attacker holding an intercepted
      code cannot sit and try verifiers against it, because the first wrong
      guess destroys the code. The cost is that a client which gets its own
      verifier wrong must restart the flow, which is the correct outcome.
    */
    const grant = await oauth.store.redeemAuthCode(hashOpaqueToken(code), new Date(api.now()));
    if (grant === null) return tokenError(reply, 400, 'invalid_grant');
    if (grant.clientId !== clientId) return tokenError(reply, 400, 'invalid_grant');
    // Byte equality, not `redirectUriMatches`: the RFC requires the redemption
    // to present the same URI the authorization request did, and the loopback
    // port exemption belongs at registration, not here -- the code was bound to
    // one concrete URI.
    if (grant.redirectUri !== redirectUri) return tokenError(reply, 400, 'invalid_grant');
    if (!verifyCodeChallenge(verifier, grant.codeChallenge)) {
      return tokenError(reply, 400, 'invalid_grant');
    }

    const refreshToken = newOpaqueToken();
    await oauth.store.createRefreshToken({
      tokenHash: hashOpaqueToken(refreshToken),
      clientId,
      userId: grant.userId,
      scope: grant.scope,
      expiresAt: new Date(api.now() + REFRESH_TOKEN_TTL_MS)
    });

    return sendTokens(reply, { userId: grant.userId, scope: grant.scope, refreshToken });
  }

  async function refreshTokenGrant(
    reply: FastifyReply,
    params: Record<string, string>,
    clientId: string
  ): Promise<FastifyReply> {
    const presented = single(params, 'refresh_token');
    if (presented === undefined) return tokenError(reply, 400, 'invalid_request');

    /*
      ROTATION, and the client binding is part of the same statement rather
      than a check after it. Checking the client afterwards would mean a
      mismatched client_id still SPENT the owner's live refresh token on its
      way to being refused -- a way for anyone who has seen the token to break
      the legitimate connector without gaining anything.
    */
    const replacement = newOpaqueToken();
    const grant = await oauth.store.rotateRefreshToken({
      presentedHash: hashOpaqueToken(presented),
      clientId,
      replacementHash: hashOpaqueToken(replacement),
      expiresAt: new Date(api.now() + REFRESH_TOKEN_TTL_MS),
      now: new Date(api.now())
    });
    if (grant === null) return tokenError(reply, 400, 'invalid_grant');

    return sendTokens(reply, {
      userId: grant.userId,
      // Carried forward from the spent row, never from the request: a refresh
      // must not be able to widen what was granted.
      scope: grant.scope,
      refreshToken: replacement
    });
  }

  function sendTokens(
    reply: FastifyReply,
    issued: { userId: string; scope: string; refreshToken: string }
  ): FastifyReply {
    const now = api.now();
    return reply.send({
      access_token: signAccessToken(
        {
          subject: issued.userId,
          // The canonical MCP URL, which the resource server will require of
          // every token it is shown.
          audience: resource,
          scope: issued.scope,
          issuedAtMs: now
        },
        api.sessionSecret
      ),
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: issued.refreshToken,
      scope: issued.scope
    });
  }
}

function answerInvalid(
  reply: FastifyReply,
  validated: Extract<Validation, { ok: false }>
): FastifyReply {
  if ('page' in validated) {
    return reply
      .code(400)
      .header('cache-control', NO_STORE)
      .type('text/html; charset=utf-8')
      .send(renderRequestErrorPage(validated.page));
  }
  return redirectBack(reply, validated.redirectUri, {
    error: validated.error,
    state: validated.state
  });
}

/**
 * Back to the client, preserving whatever query the registered URI already
 * carried -- a loopback URI is allowed to have one, and dropping it would send
 * the client somewhere it did not ask to go.
 */
function redirectBack(
  reply: FastifyReply,
  redirectUri: string,
  params: { code?: string; error?: string; state: string | undefined }
): FastifyReply {
  const target = new URL(redirectUri);
  if (params.code !== undefined) target.searchParams.set('code', params.code);
  if (params.error !== undefined) target.searchParams.set('error', params.error);
  // Omitted entirely when the client sent none, rather than sent as empty.
  if (params.state !== undefined) target.searchParams.set('state', params.state);
  return reply.code(302).header('cache-control', NO_STORE).redirect(target.toString());
}

function registrationError(
  reply: FastifyReply,
  error: string,
  description: string
): FastifyReply {
  return reply.code(400).send({ error, error_description: description });
}

/**
 * RFC 6749 section 5.2. Deliberately no `error_description` naming which check
 * failed: `invalid_grant` covers unknown, expired, already-spent, wrong client,
 * wrong redirect URI and wrong verifier, and telling a caller which one it was
 * tells it what to fix.
 */
function tokenError(reply: FastifyReply, status: number, error: string): FastifyReply {
  return reply.code(status).send({ error });
}
