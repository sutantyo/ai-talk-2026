/**
 * `application/x-www-form-urlencoded`, parsed by hand.
 *
 * Fastify ships parsers for JSON and text only, and the OAuth token endpoint
 * is required by RFC 6749 to accept a form-encoded body. The alternative was
 * `@fastify/formbody`; twelve lines and no dependency wins, and it buys
 * something the plugin does not: control over what a malformed body answers
 * with, so a bad request gets an RFC 6749 error object rather than Fastify's
 * own `{ error: 'Bad Request' }` shape, which no OAuth client knows how to
 * read.
 */

/**
 * Returns the parameters, or `null` if the body cannot be one request.
 *
 * A REPEATED PARAMETER IS A REFUSAL, not a last-one-wins. RFC 6749 section 3.1
 * says a parameter must not appear more than once, and the reason is worth
 * keeping in mind: if this server resolves `grant_type=refresh_token&
 * grant_type=authorization_code` differently from whatever else looks at the
 * same bytes -- a proxy, a log, a WAF, a person reading a capture -- then the
 * request that was authorised is not the request that was performed.
 */
export function parseFormBody(raw: unknown): Record<string, string> | null {
  if (typeof raw !== 'string') return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(raw);
  } catch {
    return null;
  }

  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    // `Object.fromEntries` would silently take the last of a repeated key,
    // which is exactly the behaviour being refused here.
    if (Object.prototype.hasOwnProperty.call(result, key)) return null;
    result[key] = value;
  }
  return result;
}

/**
 * A query string or form field as a string, or `undefined`.
 *
 * Fastify's query parser yields an array for a repeated key and Fastify's own
 * types call every value `unknown`, so this is where "the caller sent this
 * twice" becomes "absent" rather than becoming `['a','b']` further in, where
 * something would eventually compare an array to a string and get a
 * bewildering answer. An empty string is also absent: `?state=` means the
 * client sent no state.
 */
export function single(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key];
  if (typeof value !== 'string' || value === '') return undefined;
  return value;
}
