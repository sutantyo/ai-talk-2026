import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Where the built client lives, relative to wherever this module is running
 * from.
 *
 * This exists because the arithmetic it replaces was correct at exactly one
 * nesting depth. `server/src/index.ts` used to do
 * `resolve(here, '..', '..', '..')` with the comment "compiled to
 * dist-server/server/src/index.js, so the repo root is three up" — true of the
 * build output, and wrong of the source. Run through `npm run dev:server`
 * (tsx, straight off `server/src/`), three up from `server/src` is the *parent
 * of the repository*, so `clientDir` pointed at a sibling of the repo. It then
 * failed safe only by accident: no `dist/` happened to exist there, so
 * `existsSync` said no and the server ran API-only without a word. A `dist/`
 * belonging to any other project in that directory would have been served as
 * this app instead, just as silently. Task 1's review flagged it as "a
 * landmine for the container layout — fix there, explicitly"; this is that fix.
 *
 * The replacement does not count directories at all. It walks up from the
 * module looking for the nearest ancestor holding a `package.json` — the app
 * root under both layouts, because `dist-server/` holds only `tsc` output and
 * never a manifest of its own — and looks for `dist/` beside it.
 *
 * The probe is `dist/index.html`, not `dist/`. An empty or half-built `dist/`
 * is not a client: `@fastify/static` would mount happily and the SPA fallback
 * would then throw on every request trying to send an `index.html` that is not
 * there. Probing the file the fallback actually sends turns that into one
 * decision at startup.
 *
 * Nothing here is fatal. Serving no client is a legitimate mode — it is what
 * `npm run dev:server` does, with Vite serving the client on another port and
 * proxying `/api` here — so this reports what it found and leaves the caller to
 * say so out loud. What it must never do again is resolve to a directory
 * outside the application and serve whatever it finds there as this app.
 */
export interface ClientDirResolution {
  /** The directory to serve the client from, or `null` if there is not one. */
  clientDir: string | null;
  /** The nearest ancestor holding a `package.json`, or `null` if none does. */
  appRoot: string | null;
  /**
   * Every path examined, in order, whether or not it existed — so a caller
   * reporting "no client" can say where it looked, rather than leaving somebody
   * to guess at the container's layout.
   */
  checked: string[];
}

export function resolveClientDir(
  moduleDir: string,
  exists: (path: string) => boolean = existsSync
): ClientDirResolution {
  const checked: string[] = [];

  let appRoot: string | null = null;
  let dir = moduleDir;
  for (;;) {
    const manifest = join(dir, 'package.json');
    checked.push(manifest);
    if (exists(manifest)) {
      appRoot = dir;
      break;
    }
    const parent = dirname(dir);
    // `dirname` of a filesystem root is that root itself: the loop's terminator.
    if (parent === dir) break;
    dir = parent;
  }

  if (appRoot === null) return { clientDir: null, appRoot: null, checked };

  const clientDir = join(appRoot, 'dist');
  const indexHtml = join(clientDir, 'index.html');
  checked.push(indexHtml);

  return {
    clientDir: exists(indexHtml) ? clientDir : null,
    appRoot,
    checked
  };
}
