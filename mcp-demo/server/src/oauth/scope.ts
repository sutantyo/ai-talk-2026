/**
 * Two permissions, and no more: one person's organiser, and a scope the owner
 * cannot explain on the consent screen is decoration. There is no "remove"
 * scope because there is no tool that removes anything.
 */
export const LIBRARY_READ = 'library.read';
export const LIBRARY_WRITE = 'library.write';

export const SUPPORTED_SCOPES: readonly string[] = [LIBRARY_READ, LIBRARY_WRITE];

/** What a client gets when it asks for nothing in particular, which is what Claude does. */
export const DEFAULT_SCOPES: readonly string[] = [LIBRARY_READ, LIBRARY_WRITE];

/**
 * Turns a requested `scope` parameter into the granted scope string, or `null`
 * when it names a scope this server does not have (`invalid_scope`). An empty
 * request gets the defaults. The result is in a fixed order and de-duplicated.
 */
export function parseScopeRequest(raw: string | undefined): string | null {
  const requested = (raw ?? '').trim();
  if (requested === '') return DEFAULT_SCOPES.join(' ');

  const asked = new Set(requested.split(/\s+/));
  for (const scope of asked) {
    if (!SUPPORTED_SCOPES.includes(scope)) return null;
  }
  return SUPPORTED_SCOPES.filter((scope) => asked.has(scope)).join(' ');
}
