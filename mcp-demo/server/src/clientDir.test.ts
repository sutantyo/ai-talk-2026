import { describe, it, expect } from 'vitest';
import { join, resolve } from 'node:path';
import { resolveClientDir } from './clientDir';

/**
 * The filesystem, as a set of paths that exist. Every path is normalised
 * through `join` so these tests read the same on Windows and on the Linux
 * container the deploy actually runs in — the separator is not what is under
 * test here.
 */
function fsWith(...paths: string[]): (path: string) => boolean {
  const present = new Set(paths.map((p) => join(p)));
  return (path) => present.has(join(path));
}

/**
 * `resolve` rather than a bare literal so the fixture is drive-qualified on
 * Windows (`C:\srv`) and plain on POSIX (`/srv`). It matters: the arithmetic
 * this module replaced used `resolve`, and on Windows a `resolve`-built path
 * and a `join`-built one differ by the drive letter alone — enough for a
 * fixture to miss the danger it was written to catch.
 */
const ROOT = resolve('/srv');
const APP = join(ROOT, 'app');

describe('resolveClientDir', () => {
  it('finds dist/ from the compiled layout (dist-server/server/src)', () => {
    const result = resolveClientDir(
      join(APP, 'dist-server', 'server', 'src'),
      fsWith(join(APP, 'package.json'), join(APP, 'dist', 'index.html'))
    );

    expect(result.appRoot).toBe(APP);
    expect(result.clientDir).toBe(join(APP, 'dist'));
  });

  it('finds the same dist/ from the source layout (server/src, under tsx)', () => {
    // `npm run dev:server` runs this module two levels below the app root
    // rather than three. The old fixed-depth arithmetic resolved one level
    // outside the repository here; the answer must not depend on the depth.
    const result = resolveClientDir(
      join(APP, 'server', 'src'),
      fsWith(join(APP, 'package.json'), join(APP, 'dist', 'index.html'))
    );

    expect(result.appRoot).toBe(APP);
    expect(result.clientDir).toBe(join(APP, 'dist'));
  });

  it('never reaches outside the app for a dist/ — the Task 1 landmine', () => {
    // The exact shape of the bug: run from source, with no build of this app
    // present, and *another* project's dist/ sitting one level above the repo.
    // `resolve(here, '..', '..', '..')` lands on `/srv` and would have served
    // /srv/dist — a different application — as this one, with no message.
    const result = resolveClientDir(
      join(APP, 'server', 'src'),
      fsWith(join(APP, 'package.json'), join(ROOT, 'dist', 'index.html'))
    );

    // Asserted before `appRoot`, deliberately: serving the wrong directory is
    // the harm, and it is what this assertion has to be the one to report.
    expect(result.clientDir).toBeNull();
    // Not merely "not chosen": never even considered.
    expect(result.checked).not.toContain(join(ROOT, 'dist', 'index.html'));
    expect(result.appRoot).toBe(APP);
  });

  it('treats a dist/ with no index.html as no client at all', () => {
    // @fastify/static mounts on an empty directory happily; the SPA fallback
    // then throws once per request on a missing index.html. One decision at
    // startup beats a 500 per request.
    const result = resolveClientDir(
      join(APP, 'dist-server', 'server', 'src'),
      fsWith(join(APP, 'package.json'))
    );

    expect(result.appRoot).toBe(APP);
    expect(result.clientDir).toBeNull();
    expect(result.checked).toContain(join(APP, 'dist', 'index.html'));
  });

  it('stops at the filesystem root when nothing holds a package.json', () => {
    const result = resolveClientDir(join(APP, 'server', 'src'), fsWith());

    expect(result.appRoot).toBeNull();
    expect(result.clientDir).toBeNull();
    // Terminated rather than spun. Four ancestors plus the root itself, and
    // the last thing looked for is the root's own manifest — `dirname('/')` is
    // `'/'`, which is where an unguarded walk would loop for ever.
    expect(result.checked).toHaveLength(5);
    expect(result.checked.at(-1)).toMatch(/package\.json$/);
  });

  it('reports every path it looked at, so a failure can say where it looked', () => {
    const result = resolveClientDir(
      join(APP, 'dist-server', 'server', 'src'),
      fsWith(join(APP, 'package.json'))
    );

    expect(result.checked).toEqual([
      join(APP, 'dist-server', 'server', 'src', 'package.json'),
      join(APP, 'dist-server', 'server', 'package.json'),
      join(APP, 'dist-server', 'package.json'),
      join(APP, 'package.json'),
      join(APP, 'dist', 'index.html')
    ]);
  });

  it('prefers the nearest package.json when an ancestor has one too', () => {
    // A monorepo-ish layout, or simply a checkout inside another project. The
    // app root is the nearest manifest, not the outermost one.
    const result = resolveClientDir(
      join(APP, 'server', 'src'),
      fsWith(
        join(APP, 'package.json'),
        join(APP, 'dist', 'index.html'),
        join(ROOT, 'package.json'),
        join(ROOT, 'dist', 'index.html')
      )
    );

    expect(result.appRoot).toBe(APP);
    expect(result.clientDir).toBe(join(APP, 'dist'));
  });
});
