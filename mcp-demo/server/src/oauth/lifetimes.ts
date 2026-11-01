/**
 * How long the two stored credentials live. The access token's lifetime is in
 * `accessToken.ts`, beside the code that signs it.
 */

/**
 * Five minutes for an authorization code.
 *
 * RFC 6749 recommends a maximum of ten. In practice a code is redeemed within
 * a second or two of being issued -- the browser redirects and Claude
 * immediately exchanges it -- so this is not a budget for a person, it is
 * slack for a slow network and a Railway cold start on the token endpoint.
 * Shorter would risk a legitimate exchange arriving late; longer would widen
 * the window in which an intercepted code is worth stealing, and the code is
 * the one credential that travels through a browser redirect.
 */
export const AUTH_CODE_TTL_MS = 5 * 60 * 1000;

/**
 * Ninety days for a refresh token, matching SESSION_TTL_MS, and for the same
 * product reason rather than any security one: this app is carried abroad, and
 * a connector that silently stops working in a hotel with no data connection
 * is unrecoverable there. Rotation on every use is what makes a long-lived
 * refresh token acceptable -- the token in flight is only ever the newest one.
 */
export const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
