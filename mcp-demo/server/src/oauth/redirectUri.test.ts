import { describe, it, expect } from 'vitest';
import {
  CLAUDE_REDIRECT_URIS,
  isRegisterableRedirectUri,
  redirectUriMatches
} from './redirectUri';

const CLAUDE_AI = 'https://claude.ai/api/mcp/auth_callback';
const CLAUDE_COM = 'https://claude.com/api/mcp/auth_callback';

/*
  REGISTRATION IS RESTRICTED, and this is the decision worth arguing with.

  Dynamic client registration lets anybody on the internet register a client
  here. If any redirect URI were accepted, an attacker could register one
  pointing at their own server, send the owner a crafted `/oauth/authorize`
  link, and — because the owner is signed in and the consent screen is the only
  gate they see, carrying a client name the attacker chose — collect an
  authorization code for the owner's library.

  So registration accepts exactly two shapes: the Claude callback, and http
  loopback. Loopback is safe for a different reason than the first: the code
  travels to a port on the owner's own machine, so an attacker's redirect URI
  only helps them if they are already running code there.

  If a future Claude surface uses some other callback, THIS is the list to add
  it to, and the failure will be a registration refusal rather than anything
  subtle.
*/
describe('isRegisterableRedirectUri', () => {
  it('accepts the Claude callback on both hosts', () => {
    expect(isRegisterableRedirectUri(CLAUDE_AI)).toBe(true);
    expect(isRegisterableRedirectUri(CLAUDE_COM)).toBe(true);
    expect(CLAUDE_REDIRECT_URIS).toEqual([CLAUDE_AI, CLAUDE_COM]);
  });

  it('accepts http loopback on any port and any path, which is how Claude Code authenticates', () => {
    expect(isRegisterableRedirectUri('http://localhost/callback')).toBe(true);
    expect(isRegisterableRedirectUri('http://localhost:53211/callback')).toBe(true);
    expect(isRegisterableRedirectUri('http://127.0.0.1/callback')).toBe(true);
    expect(isRegisterableRedirectUri('http://127.0.0.1:6274/oauth/callback')).toBe(true);
    expect(isRegisterableRedirectUri('http://[::1]:8080/callback')).toBe(true);
  });

  it('refuses a host that merely starts with a loopback name', () => {
    // The bug this exists for: a `startsWith('localhost')` or an `includes`
    // check accepts every one of these, and each is a host the attacker owns.
    expect(isRegisterableRedirectUri('http://localhost.evil.example/callback')).toBe(false);
    expect(isRegisterableRedirectUri('http://127.0.0.1.evil.example/callback')).toBe(false);
    expect(isRegisterableRedirectUri('http://evil.example/?x=localhost')).toBe(false);
    expect(isRegisterableRedirectUri('http://localhost@evil.example/callback')).toBe(false);
  });

  it('refuses an arbitrary https callback, however plausible', () => {
    expect(isRegisterableRedirectUri('https://evil.example/callback')).toBe(false);
    expect(isRegisterableRedirectUri('https://claude.ai.evil.example/api/mcp/auth_callback')).toBe(
      false
    );
    expect(isRegisterableRedirectUri('https://notclaude.ai/api/mcp/auth_callback')).toBe(false);
  });

  it('refuses a different path on the Claude host', () => {
    // The allowance is one exact URI, not a host. Anything else on claude.ai
    // is somebody else's endpoint as far as this server is concerned.
    expect(isRegisterableRedirectUri('https://claude.ai/anything')).toBe(false);
    expect(isRegisterableRedirectUri('https://claude.ai/api/mcp/auth_callback/extra')).toBe(false);
    expect(isRegisterableRedirectUri('https://claude.ai/api/mcp/auth_callback?x=1')).toBe(false);
  });

  it('refuses plaintext http to anywhere that is not loopback', () => {
    // An authorization code over plaintext to a remote host is an
    // interception, and the loopback exemption exists precisely because
    // loopback never leaves the machine.
    expect(isRegisterableRedirectUri('http://claude.ai/api/mcp/auth_callback')).toBe(false);
    expect(isRegisterableRedirectUri('http://phrases.example.com/callback')).toBe(false);
  });

  it('refuses https on loopback, because RFC 8252 loopback redirects are http', () => {
    // Strict on purpose: nothing Claude does needs it, and every accepted
    // shape is one more thing that has to stay safe.
    expect(isRegisterableRedirectUri('https://localhost/callback')).toBe(false);
  });

  it('refuses a fragment, which RFC 6749 forbids in a redirect URI', () => {
    expect(isRegisterableRedirectUri('http://localhost/callback#x')).toBe(false);
    expect(isRegisterableRedirectUri(CLAUDE_AI + '#x')).toBe(false);
  });

  it('refuses embedded credentials', () => {
    expect(isRegisterableRedirectUri('http://user:pass@localhost/callback')).toBe(false);
  });

  it('refuses a non-http scheme, including one that looks like an app callback', () => {
    expect(isRegisterableRedirectUri('claude://callback')).toBe(false);
    expect(isRegisterableRedirectUri('javascript:alert(1)')).toBe(false);
    expect(isRegisterableRedirectUri('data:text/html,x')).toBe(false);
  });

  it('refuses nonsense without throwing', () => {
    expect(isRegisterableRedirectUri('')).toBe(false);
    expect(isRegisterableRedirectUri('not a url')).toBe(false);
    expect(isRegisterableRedirectUri('/callback')).toBe(false);
  });
});

/*
  MATCHING IS EXACT STRING EQUALITY, with exactly one exception: the port on a
  loopback URI is ignored, because Claude Code binds whatever ephemeral port it
  can get and cannot know it at registration time. RFC 8252 section 7.3 says to
  ignore it; everything else stays a byte comparison, per RFC 6749.
*/
describe('redirectUriMatches', () => {
  it('matches the Claude callback exactly', () => {
    expect(redirectUriMatches(CLAUDE_AI, CLAUDE_AI)).toBe(true);
  });

  it('does not match one Claude host against the other', () => {
    expect(redirectUriMatches(CLAUDE_AI, CLAUDE_COM)).toBe(false);
  });

  it('ignores the port on loopback, which is the whole exception', () => {
    expect(redirectUriMatches('http://localhost/callback', 'http://localhost:53211/callback')).toBe(
      true
    );
    expect(redirectUriMatches('http://localhost:1234/callback', 'http://localhost/callback')).toBe(
      true
    );
    expect(
      redirectUriMatches('http://127.0.0.1:6274/callback', 'http://127.0.0.1:51000/callback')
    ).toBe(true);
  });

  it('still requires the loopback path to match', () => {
    expect(redirectUriMatches('http://localhost/callback', 'http://localhost:9/evil')).toBe(false);
    expect(redirectUriMatches('http://localhost/callback', 'http://localhost:9/callback/x')).toBe(
      false
    );
  });

  it('still requires the loopback query to match', () => {
    expect(
      redirectUriMatches('http://localhost/callback', 'http://localhost:9/callback?code=x')
    ).toBe(false);
  });

  it('does not treat one loopback host as another', () => {
    expect(redirectUriMatches('http://localhost/callback', 'http://127.0.0.1/callback')).toBe(
      false
    );
    expect(redirectUriMatches('http://127.0.0.1/callback', 'http://[::1]/callback')).toBe(false);
  });

  /*
    The attack this closes: if the port exemption were applied by looking at
    the REQUESTED uri rather than at both, a client that registered the Claude
    callback could redeem against a loopback URI, or vice versa — turning one
    registered client into a redirect to anywhere the exemption reaches.
  */
  it('does not let the loopback exemption cross schemes or shapes', () => {
    // http and https are different origins. If the exemption reached across
    // them, a client that registered a loopback URI could redeem against an
    // https one on the same host -- and https://localhost is not necessarily
    // the same listener.
    expect(redirectUriMatches('http://localhost/callback', 'https://localhost/callback')).toBe(
      false
    );
    expect(redirectUriMatches(CLAUDE_AI, 'http://localhost:9/callback')).toBe(false);
    expect(redirectUriMatches('http://localhost/callback', CLAUDE_AI)).toBe(false);
  });

  it('refuses a trailing-slash difference', () => {
    expect(redirectUriMatches(CLAUDE_AI, CLAUDE_AI + '/')).toBe(false);
    expect(redirectUriMatches('http://localhost/callback', 'http://localhost:9/callback/')).toBe(
      false
    );
  });

  it('is case-sensitive on the path', () => {
    expect(redirectUriMatches(CLAUDE_AI, 'https://claude.ai/api/mcp/Auth_Callback')).toBe(false);
  });

  it('refuses nonsense on either side without throwing', () => {
    expect(redirectUriMatches('http://localhost/callback', '')).toBe(false);
    expect(redirectUriMatches('', 'http://localhost/callback')).toBe(false);
    expect(redirectUriMatches('not a url', 'not a url')).toBe(false);
  });
});
