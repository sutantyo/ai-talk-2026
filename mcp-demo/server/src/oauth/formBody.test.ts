import { describe, it, expect } from 'vitest';
import { parseFormBody, single } from './formBody';

describe('parseFormBody', () => {
  it('reads the parameters of a token request', () => {
    expect(parseFormBody('grant_type=refresh_token&refresh_token=abc')).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'abc'
    });
  });

  it('decodes percent-encoding and plus-as-space', () => {
    // A redirect URI arrives fully encoded, and a scope's space is a `+`.
    expect(parseFormBody('redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&scope=a+b')).toEqual({
      redirect_uri: 'https://claude.ai/cb',
      scope: 'a b'
    });
  });

  it('reads an empty body as no parameters', () => {
    expect(parseFormBody('')).toEqual({});
  });

  /*
    THE PROPERTY THIS FUNCTION EXISTS FOR. RFC 6749 section 3.1 says a
    parameter must not appear more than once, and `Object.fromEntries` -- the
    obvious one-liner -- silently takes the last. If this server resolved
    `grant_type=refresh_token&grant_type=authorization_code` differently from
    whatever else reads the same bytes (a proxy, a log, a capture somebody is
    debugging from), the request that was authorised would not be the request
    that was performed.
  */
  it('refuses a repeated parameter rather than picking one', () => {
    expect(parseFormBody('grant_type=refresh_token&grant_type=authorization_code')).toBeNull();
    expect(parseFormBody('code=a&code=a')).toBeNull();
  });

  it('refuses a body that is not a string, without throwing', () => {
    // Fastify hands the handler whatever the content-type parser produced, and
    // a JSON body reaches the same route as an object.
    expect(parseFormBody(undefined)).toBeNull();
    expect(parseFormBody({ grant_type: 'refresh_token' })).toBeNull();
    expect(parseFormBody(null)).toBeNull();
    expect(parseFormBody(42)).toBeNull();
  });

  it('is not fooled by a parameter named like an Object prototype member', () => {
    // `result[key]` on a bare object literal would treat an inherited
    // `constructor` as already present and refuse a legitimate request -- or,
    // written the other way round, would let a repeat through. Hence
    // `hasOwnProperty.call`.
    expect(parseFormBody('constructor=x')).toEqual({ constructor: 'x' });
    expect(parseFormBody('__proto__=x&code=y')).toMatchObject({ code: 'y' });
  });
});

describe('single', () => {
  it('returns a string value', () => {
    expect(single({ state: 'abc' }, 'state')).toBe('abc');
  });

  it('treats an absent key as undefined', () => {
    expect(single({}, 'state')).toBeUndefined();
    expect(single(undefined, 'state')).toBeUndefined();
  });

  it('treats an empty value as absent, because `?state=` carries no state', () => {
    expect(single({ state: '' }, 'state')).toBeUndefined();
  });

  /*
    Fastify's query parser yields an ARRAY for a repeated key. Without this,
    `?client_id=a&client_id=b` would put `['a','b']` somewhere that eventually
    compares it against a string, and the answer would be bewildering rather
    than wrong-looking. Collapsing it to "absent" makes the request fail the
    ordinary missing-parameter way.
  */
  it('treats a repeated query parameter as absent rather than as an array', () => {
    expect(single({ client_id: ['a', 'b'] }, 'client_id')).toBeUndefined();
  });

  it('treats a non-string value as absent', () => {
    expect(single({ state: 42 }, 'state')).toBeUndefined();
    expect(single({ state: { nested: true } }, 'state')).toBeUndefined();
  });
});
