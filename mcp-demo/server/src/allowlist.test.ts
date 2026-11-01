import { describe, it, expect } from 'vitest';
import { parseAllowlist, isEmailAllowed, normalizeEmail, type Allowlist } from './allowlist';

describe('parseAllowlist', () => {
  it('treats an unset variable as no restriction', () => {
    expect(parseAllowlist(undefined)).toBeNull();
  });

  it('treats an empty string as no restriction', () => {
    expect(parseAllowlist('')).toBeNull();
  });

  it('treats a whitespace-only value as no restriction', () => {
    expect(parseAllowlist('   ')).toBeNull();
  });

  it('splits on commas, trims, and lowercases every entry', () => {
    const list = parseAllowlist(' Traveller@Example.com , second@example.com ');
    expect(list).toEqual(new Set(['traveller@example.com', 'second@example.com']));
  });

  it('drops empty entries left by a stray comma without treating the whole value as unset', () => {
    expect(parseAllowlist('traveller@example.com,,')).toEqual(new Set(['traveller@example.com']));
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Traveller@Example.COM  ')).toBe('traveller@example.com');
  });
});

describe('isEmailAllowed', () => {
  it('allows everything when the list is null — the deliberate fail-open default', () => {
    expect(isEmailAllowed('anyone@anywhere.example', null)).toBe(true);
  });

  it('decides rather than throwing when the list was never supplied at all', () => {
    // A dependency object assembled without `allowedEmails` hands this
    // `undefined`. A strict `=== null` check would reach `undefined.has(...)`
    // and turn a wiring mistake into a 500 from the auth route — the one
    // route where an exception looks exactly like a rejection.
    expect(isEmailAllowed('anyone@anywhere.example', undefined as unknown as Allowlist)).toBe(true);
  });

  it('allows an email on the list', () => {
    expect(isEmailAllowed('traveller@example.com', new Set(['traveller@example.com']))).toBe(true);
  });

  it('rejects an email not on the list', () => {
    expect(isEmailAllowed('stranger@example.com', new Set(['traveller@example.com']))).toBe(false);
  });

  it('rejects against an empty (non-null) set — every entry parsed to nothing means nobody is allowed', () => {
    expect(isEmailAllowed('traveller@example.com', new Set())).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(isEmailAllowed('Traveller@Example.COM', new Set(['traveller@example.com']))).toBe(true);
  });

  it('matches after trimming stray whitespace on the incoming email', () => {
    expect(isEmailAllowed('  traveller@example.com  ', new Set(['traveller@example.com']))).toBe(true);
  });
});
