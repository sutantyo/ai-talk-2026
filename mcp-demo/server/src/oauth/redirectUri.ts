/**
 * Which redirect URIs may be registered, and how a redemption is matched
 * against one.
 *
 * REGISTRATION IS RESTRICTED TO TWO SHAPES, and that is a deliberate
 * narrowing of what RFC 7591 would otherwise allow. Dynamic client
 * registration is open to anyone who finds this server. If any redirect URI
 * were accepted, an attacker could register a client pointing at their own
 * host, send the owner a crafted `/oauth/authorize` link, and collect an
 * authorization code for the owner's library — because the owner is signed in
 * already and the consent screen, the only gate they see, would be showing a
 * client name the attacker chose.
 *
 * The two accepted shapes are safe for different reasons. The Claude callback
 * is a single exact URI on a host Anthropic controls. Loopback is safe because
 * the code never leaves the owner's machine, so an attacker's loopback
 * redirect only helps them if they are already running code there.
 *
 * If a future Claude surface uses some other callback, `CLAUDE_REDIRECT_URIS`
 * is the list to add it to. The failure will be a registration refusal naming
 * the URI, which is a good deal easier to diagnose than what a permissive
 * version of this file would eventually cost.
 */

/**
 * Both hosts, because Claude is served from each and the design was verified
 * against documentation on one of them. Exact URIs, not host prefixes.
 */
export const CLAUDE_REDIRECT_URIS: readonly string[] = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback'
];

/**
 * `URL.hostname` renders the IPv6 loopback bracketed, which is why `[::1]`
 * appears here in that form rather than as `::1`.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function parse(uri: string): URL | null {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

/**
 * An http loopback redirect, per RFC 8252 section 7.3: any port, any path.
 *
 * `https` on loopback is refused. Nothing Claude does needs it, and every
 * accepted shape is one more thing that has to keep being safe.
 *
 * Note what this checks and what it does not: the decision is made on the
 * PARSED host, never on the raw string. `http://localhost.evil.example/cb` and
 * `http://localhost@evil.example/cb` both contain "localhost" and neither is
 * loopback — the first is a host the attacker owns, the second sends the
 * browser to `evil.example` with `localhost` as a username.
 */
function isLoopbackRedirectUri(uri: string): boolean {
  const url = parse(uri);
  if (url === null) return false;
  if (url.protocol !== 'http:') return false;
  if (!LOOPBACK_HOSTS.has(url.hostname)) return false;
  if (url.username !== '' || url.password !== '') return false;
  // RFC 6749 section 3.1.2: a redirect URI must not carry a fragment.
  if (url.hash !== '') return false;
  return true;
}

export function isRegisterableRedirectUri(uri: string): boolean {
  if (CLAUDE_REDIRECT_URIS.includes(uri)) return true;
  return isLoopbackRedirectUri(uri);
}

/**
 * Byte-for-byte string equality, per RFC 6749 section 3.1.2 — with exactly one
 * exception: the PORT of a loopback URI is ignored, because Claude Code binds
 * whatever ephemeral port it can get and cannot know it at registration time.
 * RFC 8252 section 7.3 requires that allowance.
 *
 * BOTH sides must be loopback for the exception to apply. Testing only the
 * requested URI would let a client that registered the Claude callback redeem
 * against a loopback address, and a client that registered loopback redeem
 * against claude.ai — one registration turned into a redirect to anywhere the
 * exemption reaches.
 *
 * The final `isRegisterableRedirectUri` guard is not redundant. Without it,
 * two identical unparseable strings would compare equal and match, so a stored
 * registration that somehow held junk would validate against that same junk.
 */
export function redirectUriMatches(registered: string, requested: string): boolean {
  if (isLoopbackRedirectUri(registered) && isLoopbackRedirectUri(requested)) {
    const a = parse(registered);
    const b = parse(requested);
    if (a === null || b === null) return false;
    // Everything but the port, and the query is included: a registered URI
    // carrying one has to keep it.
    return a.hostname === b.hostname && a.pathname === b.pathname && a.search === b.search;
  }

  if (!isRegisterableRedirectUri(registered)) return false;
  return registered === requested;
}
