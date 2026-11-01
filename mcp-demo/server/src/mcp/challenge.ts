/**
 * The `401` handshake, which is the whole of how Claude finds the
 * authorization server.
 *
 * The design says it plainly: Claude discovers everything from this response,
 * and it does NOT honour a `WWW-Authenticate` header on a `200`. So the status
 * code and the header have to arrive together, and the header's exact shape is
 * a contract rather than a detail. RFC 9728 section 5.1.
 */

/**
 * `Bearer resource_metadata="<base>/.well-known/oauth-protected-resource"`.
 *
 * The URL is quoted because RFC 9728 defines `resource_metadata` as an
 * auth-param whose value is a quoted-string, and an unquoted URL containing
 * `/` and `:` is not a valid token.
 */
export function bearerChallenge(publicBaseUrl: string): string {
  return `Bearer resource_metadata="${publicBaseUrl}/.well-known/oauth-protected-resource"`;
}

/**
 * The token from an `Authorization: Bearer <token>` header, or `null`.
 *
 * Header only. RFC 6750 also describes a `access_token` query parameter and
 * this server does not implement it: a token in a URL lands in access logs, in
 * proxy logs, and in browser history, and the protected-resource metadata
 * advertises `bearer_methods_supported: ["header"]` precisely so no client
 * tries.
 */
export function bearerToken(header: string | undefined): string | null {
  // Fastify hands back an ARRAY when a header arrives twice, and `.split` on
  // an array throws -- which would turn a duplicated header, something any
  // caller can send, into a 500.
  if (typeof header !== 'string') return null;

  const parts = header.trim().split(/\s+/);
  // Exactly two: a scheme and one token. `Bearer a b` is not a bearer token
  // with a space in it, it is a malformed header.
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  // RFC 7235: the scheme is case-insensitive. Compared whole rather than by
  // prefix, so `Bearerish abc` is refused instead of yielding `abc`.
  if (scheme.toLowerCase() !== 'bearer') return null;
  if (token === '') return null;

  return token;
}
