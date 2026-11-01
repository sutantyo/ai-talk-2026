import { describe, it, expect } from 'vitest';
import { bearerChallenge, bearerToken } from './challenge';

const BASE = 'https://phrases.example.com';

/*
  THE HEADER CLAUDE DISCOVERS EVERYTHING FROM.

  The design is explicit that this is load-bearing and that Claude does NOT
  honour a `WWW-Authenticate` header on a `200` — so the exact bytes matter as
  much as the status code they arrive with. RFC 9728 section 5.1.
*/
describe('bearerChallenge', () => {
  it('is a Bearer challenge naming the protected-resource metadata URL', () => {
    expect(bearerChallenge(BASE)).toBe(
      'Bearer resource_metadata="https://phrases.example.com/.well-known/oauth-protected-resource"'
    );
  });

  it('quotes the URL, because RFC 9728 makes it a quoted-string parameter', () => {
    expect(bearerChallenge(BASE)).toContain('resource_metadata="');
    expect(bearerChallenge(BASE).endsWith('"')).toBe(true);
  });

  it('builds the metadata URL with exactly one slash', () => {
    expect(bearerChallenge(BASE)).not.toContain('//.well-known');
  });
});

describe('bearerToken', () => {
  it('reads the token out of a Bearer header', () => {
    expect(bearerToken('Bearer abc.def')).toBe('abc.def');
  });

  it('accepts any case of the scheme, which RFC 7235 makes case-insensitive', () => {
    expect(bearerToken('bearer abc')).toBe('abc');
    expect(bearerToken('BEARER abc')).toBe('abc');
  });

  it('refuses a different scheme', () => {
    // Basic credentials are not a bearer token, and treating them as one would
    // hand `verifyAccessToken` a base64 username:password to MAC-check.
    expect(bearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(bearerToken('Negotiate abc')).toBeNull();
  });

  it('refuses a scheme that merely starts with bearer', () => {
    // A `startsWith('Bearer')` check accepts this and yields a token of
    // `abc` from a scheme this server does not implement.
    expect(bearerToken('Bearerish abc')).toBeNull();
  });

  it('refuses a header with no token', () => {
    expect(bearerToken('Bearer')).toBeNull();
    expect(bearerToken('Bearer ')).toBeNull();
    expect(bearerToken('Bearer   ')).toBeNull();
  });

  it('refuses a header carrying more than one token', () => {
    expect(bearerToken('Bearer abc def')).toBeNull();
  });

  it('refuses an absent or empty header', () => {
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken('')).toBeNull();
  });

  /*
    Fastify hands back an ARRAY when a header arrives twice. Without this,
    `header.split` would throw on a request an attacker can send at will,
    turning a duplicated header into a 500.
  */
  it('refuses a repeated header rather than throwing on the array', () => {
    expect(bearerToken(['Bearer a', 'Bearer b'] as unknown as string)).toBeNull();
  });

  it('does not trim inside the token, only around the header', () => {
    expect(bearerToken('  Bearer abc  ')).toBe('abc');
  });
});
