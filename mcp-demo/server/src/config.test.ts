import { describe, it, expect } from 'vitest';
import { loadConfig, ConfigError } from './config';

const complete = {
  DATABASE_URL: 'postgres://u:p@h:5432/db',
  SESSION_SECRET: 'a'.repeat(32),
  GOOGLE_CLIENT_ID: '123.apps.googleusercontent.com',
  SECURE_COOKIES: 'true',
  PUBLIC_BASE_URL: 'https://phrases.example.com'
};

describe('loadConfig', () => {
  it('reads a complete environment', () => {
    expect(loadConfig(complete)).toEqual({
      port: 8080,
      databaseUrl: 'postgres://u:p@h:5432/db',
      devLoginEmail: null,
      sessionSecret: 'a'.repeat(32),
      googleClientId: '123.apps.googleusercontent.com',
      secureCookies: true,
      publicBaseUrl: 'https://phrases.example.com'
    });
  });

  it('takes PORT from the environment when the platform sets it', () => {
    expect(loadConfig({ ...complete, PORT: '3333' }).port).toBe(3333);
  });

  it('ignores a non-numeric PORT rather than starting on NaN', () => {
    expect(loadConfig({ ...complete, PORT: 'nonsense' }).port).toBe(8080);
  });

  it('reports every missing variable at once, not the first one', () => {
    let caught: unknown;
    try {
      loadConfig({});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    expect((caught as Error).message).toContain('SESSION_SECRET');
    expect((caught as Error).message).toContain('GOOGLE_CLIENT_ID');
    expect((caught as Error).message).toContain('SECURE_COOKIES');
    expect((caught as Error).message).toContain('PUBLIC_BASE_URL');
  });

  it('refuses to start when SECURE_COOKIES is missing, rather than guessing', () => {
    // This is the guard the owner added this variable specifically to create:
    // a server that cannot tell whether it should mark cookies Secure must
    // refuse to boot, not silently default to the unsafe (non-Secure)
    // direction the old NODE_ENV inference could fall into.
    const { SECURE_COOKIES, ...withoutIt } = complete;
    expect(() => loadConfig(withoutIt)).toThrow(ConfigError);
    try {
      loadConfig(withoutIt);
    } catch (error) {
      expect((error as Error).message).toContain('SECURE_COOKIES');
    }
  });

  it('treats an empty SECURE_COOKIES as missing, same as any other required variable', () => {
    expect(() => loadConfig({ ...complete, SECURE_COOKIES: '' })).toThrow(ConfigError);
  });

  it('accepts "true" for SECURE_COOKIES', () => {
    expect(loadConfig({ ...complete, SECURE_COOKIES: 'true' }).secureCookies).toBe(true);
  });

  it('accepts "false" for SECURE_COOKIES', () => {
    expect(loadConfig({ ...complete, SECURE_COOKIES: 'false' }).secureCookies).toBe(false);
  });

  it('rejects a plausible-looking but unaccepted SECURE_COOKIES value instead of coercing it', () => {
    // "1" is a classic truthy stand-in a naive Boolean(value) or JSON.parse
    // coercion would accept. Rejecting it is the entire point of this
    // variable: silently mis-parsing a boolean is exactly the failure mode
    // being removed.
    expect(() => loadConfig({ ...complete, SECURE_COOKIES: '1' })).toThrow(ConfigError);
    try {
      loadConfig({ ...complete, SECURE_COOKIES: '1' });
    } catch (error) {
      expect((error as Error).message).toContain('SECURE_COOKIES');
      // The message names the variable and the accepted values, but never
      // echoes back what was actually typed.
      expect((error as Error).message).not.toContain("'1'");
    }
  });

  it('rejects a session secret too short to be worth signing with', () => {
    expect(() => loadConfig({ ...complete, SESSION_SECRET: 'short' })).toThrow(ConfigError);
  });

  it('treats an empty string as missing', () => {
    expect(() => loadConfig({ ...complete, SESSION_SECRET: '' })).toThrow(ConfigError);
  });

  it('runs without DATABASE_URL, which means PGlite locally', () => {
    const { DATABASE_URL: _unused, ...rest } = complete;
    expect(loadConfig(rest).databaseUrl).toBeNull();
    expect(loadConfig({ ...complete, DATABASE_URL: '' }).databaseUrl).toBeNull();
  });

  it('allows the test sign-in only on localhost, and then needs no Google client', () => {
    const local = { ...complete, PUBLIC_BASE_URL: 'http://localhost:8080', GOOGLE_CLIENT_ID: '', DEV_LOGIN_EMAIL: 'me@test.invalid' };
    expect(loadConfig(local).devLoginEmail).toBe('me@test.invalid');
    expect(() => loadConfig({ ...local, PUBLIC_BASE_URL: 'https://couch.example.com' })).toThrow(/local testing only/);
    expect(() => loadConfig({ ...local, PUBLIC_BASE_URL: 'http://localhost.evil.com' })).toThrow(ConfigError);
  });

  it('never puts a secret in the error message', () => {
    try {
      loadConfig({ ...complete, SESSION_SECRET: 'short' });
    } catch (error) {
      expect((error as Error).message).not.toContain('short');
      expect((error as Error).message).not.toContain(complete.DATABASE_URL);
    }
  });
});

/*
  PUBLIC_BASE_URL exists because the OAuth metadata documents have to state
  absolute URLs, and the connector's `resource` identifier must equal the URL
  the owner typed into Claude EXACTLY -- a mismatch is a failed discovery
  handshake, not a warning. That value cannot come from the request: `Host` is
  attacker-controlled, and a server that derives its own identity from an
  inbound header can be told to advertise somebody else's authorization
  server. So it is configuration, and — following SECURE_COOKIES — it is
  required, because a server that cannot say who it is must not boot and start
  handing out tokens with a guessed audience.
*/
describe('loadConfig: PUBLIC_BASE_URL', () => {
  const withBase = (value: string) => () => loadConfig({ ...complete, PUBLIC_BASE_URL: value });

  it('reads an https origin', () => {
    expect(withBase('https://phrases.example.com')().publicBaseUrl).toBe(
      'https://phrases.example.com'
    );
  });

  it('accepts a plain-http localhost origin, because local development has no HTTPS', () => {
    expect(withBase('http://localhost:8080')().publicBaseUrl).toBe('http://localhost:8080');
  });

  it('refuses to start when it is missing, rather than guessing an identity', () => {
    const { PUBLIC_BASE_URL, ...withoutIt } = complete;
    expect(() => loadConfig(withoutIt)).toThrow(ConfigError);
  });

  it('rejects a trailing slash, which would build the resource URL with a doubled slash', () => {
    // Every URL in the metadata is this value plus a path. With a trailing
    // slash the resource identifier becomes `https://host//mcp`, which is a
    // different string from what the owner typed into Claude — and string
    // equality is the whole of how that identifier is checked. Normalising it
    // silently would be the friendlier-looking choice and the wrong one: the
    // owner would then have a working server and a `resource` value that does
    // not match their configuration, with nothing saying so.
    expect(withBase('https://phrases.example.com/')).toThrow(ConfigError);
  });

  it('rejects a bare hostname with no scheme', () => {
    expect(withBase('phrases.example.com')).toThrow(ConfigError);
  });

  it('rejects a scheme that is not http or https', () => {
    expect(withBase('ftp://phrases.example.com')).toThrow(ConfigError);
    expect(withBase('javascript:alert(1)')).toThrow(ConfigError);
  });

  it('rejects a path, because the well-known documents are served from the root', () => {
    // RFC 8414 and RFC 9728 put discovery at `/.well-known/...` on the origin.
    // Accepting `https://host/app` would produce metadata URLs this server
    // does not serve, and the failure would surface as an unexplained
    // discovery timeout in Claude rather than as a configuration error here.
    expect(withBase('https://phrases.example.com/app')).toThrow(ConfigError);
  });

  it('rejects a query or a fragment', () => {
    expect(withBase('https://phrases.example.com?a=1')).toThrow(ConfigError);
    expect(withBase('https://phrases.example.com#a')).toThrow(ConfigError);
  });

  it('rejects embedded credentials', () => {
    // A base URL is pasted into metadata documents and into the consent page.
    // Credentials in it would be published to every client that reads them.
    expect(withBase('https://user:pass@phrases.example.com')).toThrow(ConfigError);
  });

  it('names the variable in the failure but never echoes what was typed', () => {
    // Same discipline as the rest of this file: a configuration error ends up
    // in a build log, and the message says which variable to look at rather
    // than reprinting its value.
    try {
      withBase('ftp://phrases.example.com')();
      throw new Error('expected a ConfigError');
    } catch (error) {
      expect((error as Error).message).toContain('PUBLIC_BASE_URL');
      expect((error as Error).message).not.toContain('ftp://');
    }
  });
});
