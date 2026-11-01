import { SUPPORTED_SCOPES } from './scope.js';
import { CODE_CHALLENGE_METHOD } from './pkce.js';

/**
 * The two discovery documents. Claude learns everything about this server from
 * them, so their shape is a contract rather than an implementation detail.
 */

/**
 * The connector URL, and therefore the `resource` identifier and every access
 * token's audience.
 *
 * ONE PLACE, because three separate things have to agree on this string
 * exactly: the metadata document Claude reads, the audience stamped on tokens,
 * and the audience the resource server checks. `PUBLIC_BASE_URL` is validated
 * to carry no trailing slash precisely so this concatenation is safe.
 */
export function mcpResourceUrl(publicBaseUrl: string): string {
  return `${publicBaseUrl}/mcp`;
}

/**
 * RFC 9728. `resource` must equal the connector URL as the owner typed it into
 * Claude -- it is compared as a string, so a trailing slash or an http/https
 * mismatch is a failed handshake, not a warning.
 */
export function protectedResourceMetadata(publicBaseUrl: string): Record<string, unknown> {
  return {
    resource: mcpResourceUrl(publicBaseUrl),
    authorization_servers: [publicBaseUrl],
    scopes_supported: [...SUPPORTED_SCOPES],
    // The bearer token goes in the Authorization header. Not in a query
    // parameter: that lands in access logs and in browser history.
    bearer_methods_supported: ['header']
  };
}

/**
 * RFC 8414.
 *
 * `token_endpoint_auth_methods_supported: ['none']` is the honest statement of
 * what this is: dynamic registration creates PUBLIC clients with no secret, so
 * PKCE and the registered redirect URI are what stand in for client
 * authentication.
 *
 * `code_challenge_methods_supported` advertises S256 alone. Advertising
 * `plain` as well would invite a client to use it and then be refused at the
 * token endpoint -- a worse failure than never offering it.
 */
export function authorizationServerMetadata(publicBaseUrl: string): Record<string, unknown> {
  return {
    issuer: publicBaseUrl,
    authorization_endpoint: `${publicBaseUrl}/oauth/authorize`,
    token_endpoint: `${publicBaseUrl}/oauth/token`,
    registration_endpoint: `${publicBaseUrl}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: [CODE_CHALLENGE_METHOD],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...SUPPORTED_SCOPES]
  };
}
