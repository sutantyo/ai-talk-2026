import { describe, expect, it } from 'vitest';
import { DEFAULT_SCOPES, SUPPORTED_SCOPES, parseScopeRequest } from './scope.js';

describe('parseScopeRequest', () => {
  it('offers read and write only', () => {
    expect(SUPPORTED_SCOPES).toEqual(['library.read', 'library.write']);
    expect(DEFAULT_SCOPES).toEqual(['library.read', 'library.write']);
  });

  it('grants the defaults when nothing is asked for', () => {
    expect(parseScopeRequest(undefined)).toBe('library.read library.write');
    expect(parseScopeRequest('   ')).toBe('library.read library.write');
  });

  it('orders and de-duplicates what is asked for', () => {
    expect(parseScopeRequest('library.write library.read library.write')).toBe('library.read library.write');
    expect(parseScopeRequest('library.read')).toBe('library.read');
  });

  it('refuses a scope it does not have', () => {
    expect(parseScopeRequest('library.read library.remove')).toBeNull();
    expect(parseScopeRequest('library.readonly')).toBeNull();
  });
});
